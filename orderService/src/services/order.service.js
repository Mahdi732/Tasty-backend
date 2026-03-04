import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import { EVENTS } from '../constants/messaging.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants/order.js';

export class OrderService {
  constructor({ orderRepository, membershipRepository, processedEventRepository, qrService, rabbitBus, logger }) {
    this.orderRepository = orderRepository;
    this.membershipRepository = membershipRepository;
    this.processedEventRepository = processedEventRepository;
    this.qrService = qrService;
    this.rabbitBus = rabbitBus;
    this.logger = logger;
  }

  calcTotals(items) {
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    return { subtotal, tax: 0, serviceFee: 0, discount: 0, total: subtotal };
  }

  async createOrder(auth, payload, headers = {}) {
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

    const order = await this.orderRepository.create({
      userId: auth.userId,
      restaurantId: String(payload.restaurantId),
      orderType: payload.orderType,
      orderStatus: ORDER_STATUS.CREATED,
      items,
      restaurantSnapshot: payload.restaurantSnapshot,
      fulfillment: payload.fulfillment,
      totals: this.calcTotals(items),
      payment: {
        status: payload.paymentRequired ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.UNPAID,
        resourceType: 'ORDER',
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

    return { ...updated.toObject(), qrToken: finalQr.rawToken };
  }

  listMyOrders(auth) {
    return this.orderRepository.listByUser(auth.userId);
  }

  async listRestaurantOrders(restaurantId, auth) {
    const hasAccess = await this.membershipRepository.hasRestaurantAccess(restaurantId, auth.userId);
    if (!hasAccess) {
      throw new ApiError(403, ERROR_CODES.TENANT_ACCESS_DENIED, 'Access denied for this restaurant');
    }
    return this.orderRepository.listByRestaurant(restaurantId);
  }

  listAllOrders() {
    return this.orderRepository.listAll();
  }

  async scanQr(rawToken, workerId, headers = {}) {
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

    const updated = await this.orderRepository.updateById(orderId, {
      'qr.scannedAt': new Date(),
      'qr.scannedBy': workerId,
      orderStatus: ORDER_STATUS.COMPLETED,
    });

    await this.rabbitBus.publishEvent('order.qr.scanned', {
      orderId: String(updated._id),
      restaurantId: updated.restaurantId,
      scannedBy: workerId,
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

    await this.rabbitBus.publishEvent(EVENTS.ORDER_PAYMENT_STATUS_CHANGED, {
      orderId: String(updated._id),
      paymentStatus: PAYMENT_STATUS.PAID,
    }, headers);
  }
}
