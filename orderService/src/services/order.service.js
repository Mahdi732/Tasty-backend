import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import { EVENTS } from '../constants/messaging.js';
import { DEBT_STATUS, ORDER_STATUS, ORDER_TYPE, PAYMENT_METHOD, PAYMENT_STATUS } from '../constants/order.js';
import { ROLES } from '../constants/roles.js';

export class OrderService {
  constructor({ orderRepository, membershipRepository, processedEventRepository, qrService, rabbitBus, paymentSkeletonService, faceBlacklistClient, logger }) {
    this.orderRepository = orderRepository;
    this.membershipRepository = membershipRepository;
    this.processedEventRepository = processedEventRepository;
    this.qrService = qrService;
    this.rabbitBus = rabbitBus;
    this.paymentSkeletonService = paymentSkeletonService;
    this.faceBlacklistClient = faceBlacklistClient;
    this.logger = logger;
  }

  calcTotals(items) {
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    return { subtotal, tax: 0, serviceFee: 0, discount: 0, total: subtotal };
  }

  deriveInitialState({ orderType, paymentMethod }) {
    const isPayOnApp = paymentMethod === PAYMENT_METHOD.PAY_ON_APP;
    return {
      orderStatus: isPayOnApp ? ORDER_STATUS.PAID : ORDER_STATUS.CREATED,
      paymentStatus: isPayOnApp ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.UNPAID,
      paymentMethod,
      orderType,
    };
  }

  buildImmutableSnapshot(payload, items, totals) {
    return {
      restaurant: {
        id: String(payload.restaurantId),
        name: payload.restaurantSnapshot.name,
        slug: payload.restaurantSnapshot.slug || null,
        citySlug: payload.restaurantSnapshot.citySlug || null,
        version: payload.restaurantSnapshot.version || 1,
        taxRateAtOrder: payload.restaurantSnapshot.taxRate ?? 0,
        serviceFeeAtOrder: payload.restaurantSnapshot.serviceFee ?? 0,
        currency: payload.restaurantSnapshot.currency || 'USD',
      },
      items,
      totals,
      capturedAt: new Date(),
    };
  }

  determineScanOutcome(order) {
    const isPayLater = order.payment?.method === PAYMENT_METHOD.PAY_LATER;

    if (order.orderType === ORDER_TYPE.DELIVERY) {
      return {
        orderStatus: isPayLater ? ORDER_STATUS.PAID : ORDER_STATUS.DELIVERED,
        paymentStatus: isPayLater ? PAYMENT_STATUS.PAID : order.payment.status,
      };
    }

    if (order.orderType === ORDER_TYPE.PREORDER) {
      return {
        orderStatus: ORDER_STATUS.OBTAINED,
        paymentStatus: isPayLater ? PAYMENT_STATUS.PAID : order.payment.status,
      };
    }

    return {
      orderStatus: ORDER_STATUS.FINISHED,
      paymentStatus: isPayLater ? PAYMENT_STATUS.PAID : order.payment.status,
    };
  }

  async assertScannerAuthorized(order, auth) {
    const roles = auth.roles || [];

    if (roles.includes(ROLES.SUPERADMIN)) {
      return;
    }

    const allowedForOrderType = order.orderType === ORDER_TYPE.DELIVERY
      ? roles.includes(ROLES.DELIVERY_MAN)
      : (roles.includes(ROLES.STAFF) || roles.includes(ROLES.MANAGER));

    if (!allowedForOrderType) {
      throw new ApiError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Scanner role is not authorized for this order flow');
    }

    const hasAccess = await this.membershipRepository.hasRestaurantAccess(order.restaurantId, auth.userId);
    if (!hasAccess) {
      throw new ApiError(403, ERROR_CODES.TENANT_ACCESS_DENIED, 'Access denied for this restaurant');
    }
  }

  async createOrder(auth, payload, headers = {}) {
    const initialState = this.deriveInitialState(payload);
    const qr = this.qrService.buildTokenPayload({
      orderId: 'pending',
      restaurantId: payload.restaurantId,
    });

    const items = payload.items.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.unitPrice * item.quantity,
    }));

    const totals = this.calcTotals(items);
    const immutableSnapshot = this.buildImmutableSnapshot(payload, items, totals);

    const order = await this.orderRepository.create({
      userId: auth.userId,
      restaurantId: String(payload.restaurantId),
      orderType: initialState.orderType,
      orderStatus: initialState.orderStatus,
      items,
      restaurantSnapshot: payload.restaurantSnapshot,
      immutableSnapshot,
      fulfillment: payload.fulfillment,
      totals,
      payment: {
        method: initialState.paymentMethod,
        status: initialState.paymentStatus,
        resourceType: 'ORDER',
      },
      debt: {
        status: DEBT_STATUS.NONE,
        amount: 0,
      },
      riskFlags: {
        qrExpiredBlacklistTriggered: false,
        temporaryReview: false,
      },
      qr: {
        tokenHash: qr.tokenHash,
        expiresAt: qr.expiresAt,
      },
    });

    const finalQr = this.qrService.buildTokenPayload({
      orderId: String(order._id),
      restaurantId: order.restaurantId,
    });

    const updated = await this.orderRepository.updateById(order._id, {
      qr: { tokenHash: finalQr.tokenHash, expiresAt: finalQr.expiresAt },
    });

    await this.rabbitBus.publishEvent(EVENTS.ORDER_CREATED, {
      orderId: String(updated._id),
      restaurantId: updated.restaurantId,
      userId: updated.userId,
      orderType: updated.orderType,
      orderStatus: updated.orderStatus,
      paymentStatus: updated.payment.status,
    }, headers);

    await this.rabbitBus.publishEvent(EVENTS.ORDER_QR_GENERATED, {
      orderId: String(updated._id),
      restaurantId: updated.restaurantId,
      expiresAt: finalQr.expiresAt.toISOString(),
    }, headers);

    await this.paymentSkeletonService.requestVerification({
      orderId: String(updated._id),
      userId: updated.userId,
      restaurantId: updated.restaurantId,
      paymentMethod: updated.payment.method,
      amount: updated.totals.total,
    }, headers);

    await this.rabbitBus.publishEvent(EVENTS.INVENTORY_CHECK, {
      orderId: String(updated._id),
      restaurantId: updated.restaurantId,
      items: updated.items.map((item) => ({ menuItemId: item.menuItemId, quantity: item.quantity })),
    }, headers);

    if (updated.payment.status === PAYMENT_STATUS.PAID) {
      await this.rabbitBus.publishEvent(EVENTS.ORDER_PAID, {
        orderId: String(updated._id),
        restaurantId: updated.restaurantId,
        userId: updated.userId,
        total: updated.totals.total,
      }, headers);
    }

    return { ...updated.toObject(), qrToken: finalQr.rawToken };
  }

  listMyOrders(auth) {
    return this.orderRepository.listByUser(auth.userId);
  }

  async listRestaurantOrders(restaurantId, auth) {
    if (auth.roles?.includes(ROLES.SUPERADMIN)) {
      return this.orderRepository.listByRestaurant(restaurantId);
    }

    const hasAccess = await this.membershipRepository.hasRestaurantAccess(restaurantId, auth.userId);
    if (!hasAccess) {
      throw new ApiError(403, ERROR_CODES.TENANT_ACCESS_DENIED, 'Access denied for this restaurant');
    }
    return this.orderRepository.listByRestaurant(restaurantId);
  }

  listAllOrders() {
    return this.orderRepository.listAll();
  }

  async scanQr(rawToken, auth, headers = {}) {
    const verified = this.qrService.verifyToken(rawToken);
    if (!verified.valid) {
      throw new ApiError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid QR token');
    }

    const { orderId, restaurantId } = verified.payload;
    const order = await this.orderRepository.findById(orderId);
    if (!order || order.restaurantId !== String(restaurantId)) {
      throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');
    }

    if (order.qr.scannedAt) {
      throw new ApiError(409, ERROR_CODES.CONFLICT, 'QR token already used');
    }

    const tokenHash = this.qrService.hashToken(rawToken);
    if (tokenHash !== order.qr.tokenHash) {
      throw new ApiError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid QR token');
    }

    await this.assertScannerAuthorized(order, auth);

    const outcome = this.determineScanOutcome(order);

    const updated = await this.orderRepository.updateById(orderId, {
      'qr.scannedAt': new Date(),
      'qr.scannedBy': auth.userId,
      orderStatus: outcome.orderStatus,
      'payment.status': outcome.paymentStatus,
      debt: {
        status: DEBT_STATUS.CLEARED,
        amount: 0,
        recordedAt: order.debt?.recordedAt || null,
        clearedAt: new Date(),
      },
      riskFlags: {
        qrExpiredBlacklistTriggered: false,
        temporaryReview: false,
      },
    });

    await this.rabbitBus.publishEvent('order.qr.scanned', {
      orderId: String(updated._id),
      restaurantId: updated.restaurantId,
      scannedBy: auth.userId,
      orderStatus: updated.orderStatus,
      paymentStatus: updated.payment.status,
    }, headers);

    if (updated.payment.status === PAYMENT_STATUS.PAID) {
      await this.rabbitBus.publishEvent(EVENTS.ORDER_PAID, {
        orderId: String(updated._id),
        restaurantId: updated.restaurantId,
        userId: updated.userId,
        total: updated.totals.total,
      }, headers);
    }

    await this.rabbitBus.publishEvent(EVENTS.INVENTORY_CONSUMED, {
      orderId: String(updated._id),
      restaurantId: updated.restaurantId,
      items: updated.items.map((item) => ({ menuItemId: item.menuItemId, quantity: item.quantity })),
      consumedAt: new Date().toISOString(),
    }, headers);

    return updated;
  }

  async onPaymentSucceeded(event, headers = {}) {
    if (await this.processedEventRepository.isProcessed(headers.eventId)) return;

    const order = await this.orderRepository.findById(event.resourceId);
    if (!order) return;

    const updated = await this.orderRepository.updateById(order._id, {
      'payment.status': PAYMENT_STATUS.PAID,
      'payment.providerRef': event.providerRef || null,
      'payment.lastPaymentEventId': headers.eventId || null,
    });

    await this.processedEventRepository.markProcessed(headers.eventId, 'payment.succeeded');

    await this.paymentSkeletonService.emitStatusChanged({
      orderId: String(updated._id),
      paymentStatus: PAYMENT_STATUS.PAID,
    }, headers);

    await this.rabbitBus.publishEvent(EVENTS.ORDER_PAID, {
      orderId: String(updated._id),
      restaurantId: updated.restaurantId,
      userId: updated.userId,
      total: updated.totals.total,
    }, headers);
  }

  async onOrderPaymentSucceeded(event, headers = {}) {
    if (await this.processedEventRepository.isProcessed(headers.eventId)) return;

    const targetOrderId = event.orderId || event.resourceId;
    const order = await this.orderRepository.findById(targetOrderId);
    if (!order) return;

    const now = new Date();
    const updated = await this.orderRepository.updateById(order._id, {
      orderStatus: ORDER_STATUS.PAID,
      'payment.status': PAYMENT_STATUS.PAID,
      'payment.providerRef': event.providerRef || null,
      'payment.lastPaymentEventId': headers.eventId || null,
    });

    await this.processedEventRepository.markProcessed(headers.eventId, 'payment.order.success');

    await this.paymentSkeletonService.emitStatusChanged({
      orderId: String(updated._id),
      paymentStatus: PAYMENT_STATUS.PAID,
    }, headers);

    await this.rabbitBus.publishEvent(EVENTS.ORDER_PAID, {
      orderId: String(updated._id),
      restaurantId: updated.restaurantId,
      userId: updated.userId,
      total: updated.totals.total,
    }, headers);

    if (updated.orderType === ORDER_TYPE.DELIVERY) {
      await this.rabbitBus.publishEvent(EVENTS.ORDER_DRIVER_ARRIVED, {
        orderId: String(updated._id),
        userId: updated.userId,
        restaurantId: updated.restaurantId,
        driverId: event.driverId || 'SYSTEM_PAYMENT_AUTOPILOT',
        arrivedAt: now.toISOString(),
        qrExpiresAt: updated.qr?.expiresAt ? new Date(updated.qr.expiresAt).toISOString() : null,
        phoneNumber: event.phoneNumber || null,
        pushToken: event.pushToken || null,
        idNumberMasked: event.idNumberMasked || 'UNKNOWN',
        debtAmount: event.debtAmount ?? updated.totals?.total ?? 0,
      }, headers);
    }
  }

  async processExpiredQrOrders({ limit = 200 } = {}) {
    const now = new Date();
    const expiredOrders = await this.orderRepository.findExpiredUnscanned(now, limit);
    let processed = 0;

    for (const order of expiredOrders) {
      const updated = await this.orderRepository.updateById(order._id, {
        orderStatus: ORDER_STATUS.EXPIRED,
        debt: {
          status: DEBT_STATUS.OUTSTANDING,
          amount: order.totals?.total || 0,
          recordedAt: now,
          clearedAt: null,
        },
        riskFlags: {
          qrExpiredBlacklistTriggered: true,
          temporaryReview: true,
        },
      });

      if (this.faceBlacklistClient) {
        await this.faceBlacklistClient.addDebtor({
          userId: updated.userId,
          debtAmount: updated.totals?.total || 0,
          requestId: `qr-expire-${String(updated._id)}`,
        });
      }

      await this.rabbitBus.publishEvent('order.qr.expired', {
        orderId: String(updated._id),
        userId: updated.userId,
        restaurantId: updated.restaurantId,
        debtAmount: updated.totals?.total || 0,
      });

      processed += 1;
    }

    return { processed };
  }

  async markDriverArrived(orderId, auth, metadata = {}, headers = {}) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');
    }

    if (order.orderType !== ORDER_TYPE.DELIVERY) {
      throw new ApiError(409, ERROR_CODES.CONFLICT, 'Driver arrival is only valid for delivery orders');
    }

    await this.assertScannerAuthorized(order, auth);

    const now = new Date();
    const updated = await this.orderRepository.updateById(order._id, {
      'fulfillment.driverArrivedAt': now,
    });

    await this.rabbitBus.publishEvent(EVENTS.ORDER_DRIVER_ARRIVED, {
      orderId: String(updated._id),
      userId: updated.userId,
      restaurantId: updated.restaurantId,
      driverId: auth.userId,
      arrivedAt: now.toISOString(),
      qrExpiresAt: updated.qr?.expiresAt ? new Date(updated.qr.expiresAt).toISOString() : null,
      phoneNumber: metadata.phoneNumber || null,
      pushToken: metadata.pushToken || null,
      idNumberMasked: metadata.idNumberMasked || 'UNKNOWN',
      debtAmount: metadata.debtAmount ?? updated.totals?.total ?? 0,
    }, headers);

    return updated;
  }
}

