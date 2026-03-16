import { Router } from 'express';
import { requireActiveAndFaceVerified } from '../middlewares/auth.middleware.js';
import { env } from '../config/env.js';

export const buildApiRoutes = ({ grpcClients, authMiddleware }) => {
  const router = Router();
  const getCorrelationId = (req) => String(req.correlationId || req.requestId || req.headers['x-request-id'] || '');
  const isUpstreamUnavailableError = (error) => Boolean(error?.isUpstreamUnavailable);

  const normalizeErrorPayload = (payload, fallbackCode, fallbackMessage) => {
    const code = payload?.error?.code || payload?.code || fallbackCode;
    const message = payload?.error?.message || payload?.message || fallbackMessage;
    return {
      success: false,
      error: {
        code: String(code),
        message: String(message),
      },
    };
  };

  const sendUnavailable = (res, code, message) => {
    res.status(503).json(normalizeErrorPayload(null, code, message));
  };

  const forwardToUserService = async (req, res, {
    path,
    method = 'POST',
    requiresAuth = false,
    stripAuthTokens = false,
    notFoundCode = 'AUTH_ROUTE_NOT_FOUND',
    unavailableCode = 'AUTH_SERVICE_UNAVAILABLE',
    unavailableMessage = 'Authentication service temporarily unavailable',
  }) => {
    const headers = {
      'content-type': 'application/json',
      'x-request-id': getCorrelationId(req),
      'x-correlation-id': getCorrelationId(req),
    };

    if (requiresAuth && req.headers.authorization) {
      headers.authorization = req.headers.authorization;
    }

    if (req.headers.cookie) {
      headers.cookie = req.headers.cookie;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let upstream;
    try {
      upstream = await fetch(`${env.USER_HTTP_BASE_URL}${path}`, {
        method,
        headers,
        body: method === 'GET' ? undefined : JSON.stringify(req.body || {}),
        signal: controller.signal,
      });
    } catch (_error) {
      clearTimeout(timeout);
      sendUnavailable(res, unavailableCode, unavailableMessage);
      return;
    }
    clearTimeout(timeout);

    const setCookie = upstream.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('set-cookie', setCookie);
    }

    let payload;
    try {
      payload = await upstream.json();
    } catch (_error) {
      payload = normalizeErrorPayload(null, notFoundCode, 'Invalid upstream response');
    }

    if (!payload?.success) {
      res.status(upstream.status).json(normalizeErrorPayload(payload, notFoundCode, 'Upstream error'));
      return;
    }

    if (stripAuthTokens && payload?.data && typeof payload.data === 'object') {
      const sanitized = {
        ...payload,
        data: {
          ...payload.data,
        },
      };
      delete sanitized.data.accessToken;
      delete sanitized.data.refreshToken;
      delete sanitized.data.access_token;
      delete sanitized.data.refresh_token;
      res.status(upstream.status).json(sanitized);
      return;
    }

    res.status(upstream.status).json(payload);
  };

  const forwardToPaymentService = async (req, res, {
    path,
    method = 'POST',
    unavailableCode = 'PAYMENT_SERVICE_UNAVAILABLE',
    unavailableMessage = 'Payment service temporarily unavailable',
  }) => {
    const headers = {
      'content-type': 'application/json',
      'x-request-id': getCorrelationId(req),
      'x-correlation-id': getCorrelationId(req),
    };

    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let upstream;
    try {
      upstream = await fetch(`${env.PAYMENT_HTTP_BASE_URL}${path}`, {
        method,
        headers,
        body: method === 'GET' ? undefined : JSON.stringify(req.body || {}),
        signal: controller.signal,
      });
    } catch (_error) {
      clearTimeout(timeout);
      sendUnavailable(res, unavailableCode, unavailableMessage);
      return;
    }
    clearTimeout(timeout);

    let payload;
    try {
      payload = await upstream.json();
    } catch (_error) {
      payload = normalizeErrorPayload(null, 'PAYMENT_UPSTREAM_INVALID_RESPONSE', 'Invalid upstream response');
    }

    if (!payload?.success) {
      res.status(upstream.status).json(normalizeErrorPayload(payload, 'PAYMENT_UPSTREAM_ERROR', 'Upstream payment error'));
      return;
    }

    res.status(upstream.status).json(payload);
  };

  router.post('/api/v1/auth/register', async (req, res) => {
    let response;
    try {
      response = await grpcClients.user.registerUser({
        email: req.body.email,
        password: req.body.password,
        phone_number: req.body.phoneNumber,
        nickname: req.body.nickname || '',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'] || '',
        device_id: req.body.deviceId || '',
      }, { requestId: getCorrelationId(req), correlationId: getCorrelationId(req) });
    } catch (error) {
      if (isUpstreamUnavailableError(error)) {
        sendUnavailable(res, 'AUTH_SERVICE_UNAVAILABLE', 'Authentication service temporarily unavailable');
        return;
      }
      throw error;
    }

    if (!response.success) {
      res.status(400).json({ success: false, error: { code: 'REGISTER_FAILED', message: response.message } });
      return;
    }

    res.status(201).json({ success: true, data: response });
  });

  router.post('/api/v1/auth/login', async (req, res) => {
    await forwardToUserService(req, res, {
      path: '/auth/login',
      stripAuthTokens: true,
    });
  });

  router.post('/api/v1/auth/refresh', async (req, res) => {
    await forwardToUserService(req, res, {
      path: '/auth/refresh',
      stripAuthTokens: true,
    });
  });

  router.post('/api/v1/auth/logout', authMiddleware, async (req, res) => {
    await forwardToUserService(req, res, {
      path: '/auth/logout',
      requiresAuth: true,
    });
  });

  router.post('/api/v1/auth/email/start-verification', async (req, res) => {
    await forwardToUserService(req, res, {
      path: '/auth/email/start-verification',
    });
  });

  router.post('/api/v1/auth/email/verify', async (req, res) => {
    await forwardToUserService(req, res, {
      path: '/auth/email/verify',
    });
  });

  router.post('/api/v1/auth/phone/start-verification', authMiddleware, async (req, res) => {
    await forwardToUserService(req, res, {
      path: '/auth/phone/start-verification',
      requiresAuth: true,
    });
  });

  router.post('/api/v1/auth/phone/verify', authMiddleware, async (req, res) => {
    await forwardToUserService(req, res, {
      path: '/auth/phone/verify',
      requiresAuth: true,
    });
  });

  router.post('/api/v1/activate-account', authMiddleware, async (req, res) => {
    await forwardToUserService(req, res, {
      path: '/activate-account',
      requiresAuth: true,
      unavailableCode: 'USER_SERVICE_UNAVAILABLE',
      unavailableMessage: 'User service temporarily unavailable',
    });
  });

  const sendProfile = async (req, res) => {
    let response;
    try {
      response = await grpcClients.user.getUserProfile({ user_id: req.auth.userId }, {
        auth: req.auth,
        requestId: getCorrelationId(req),
        correlationId: getCorrelationId(req),
      });
    } catch (error) {
      if (isUpstreamUnavailableError(error)) {
        sendUnavailable(res, 'AUTH_SERVICE_UNAVAILABLE', 'Profile service temporarily unavailable');
        return;
      }
      throw error;
    }
    if (!response.success) {
      res.status(404).json(normalizeErrorPayload(response, 'PROFILE_NOT_FOUND', 'Profile not found'));
      return;
    }

    res.json({
      success: true,
      data: {
        userId: response.user_id,
        email: response.email,
        nickname: response.nickname,
        phoneNumber: response.phone_number,
        roles: response.roles || [],
        status: response.status,
        verification: {
          email: Boolean(response.is_email_verified),
          phone: Boolean(response.is_phone_verified),
          face: Boolean(response.is_face_verified),
        },
      },
    });
  };

  router.get('/api/v1/auth/profile', authMiddleware, sendProfile);
  router.get('/api/v1/auth/me', authMiddleware, sendProfile);

  // Crucial fraud gate: order forwarding is blocked unless ACTIVE + face verified.
  router.post('/api/v1/orders', authMiddleware, requireActiveAndFaceVerified, async (req, res) => {
    let response;
    try {
      response = await grpcClients.order.createOrder({
        restaurant_id: req.body.restaurantId,
        order_type: req.body.orderType,
        payment_method: req.body.paymentMethod,
        restaurant_snapshot: {
          name: req.body.restaurantSnapshot?.name,
          slug: req.body.restaurantSnapshot?.slug,
          city_slug: req.body.restaurantSnapshot?.citySlug,
          version: req.body.restaurantSnapshot?.version || 1,
          tax_rate: req.body.restaurantSnapshot?.taxRate || 0,
          service_fee: req.body.restaurantSnapshot?.serviceFee || 0,
          currency: req.body.restaurantSnapshot?.currency || 'USD',
        },
        fulfillment: {
          mode: req.body.fulfillment?.mode,
          delivery_address: req.body.fulfillment?.deliveryAddress,
          table_ref: req.body.fulfillment?.tableRef,
          scheduled_at: req.body.fulfillment?.scheduledAt,
        },
        items: (req.body.items || []).map((item) => ({
          menu_item_id: item.menuItemId,
          name: item.name,
          unit_price: item.unitPrice,
          quantity: item.quantity,
        })),
      }, {
        auth: req.auth,
        requestId: getCorrelationId(req),
        correlationId: getCorrelationId(req),
      });
    } catch (error) {
      if (isUpstreamUnavailableError(error)) {
        sendUnavailable(res, 'ORDER_SERVICE_UNAVAILABLE', 'Order service temporarily unavailable');
        return;
      }
      throw error;
    }

    if (!response.success) {
      res.status(400).json({ success: false, error: { code: 'ORDER_CREATE_FAILED', message: response.message } });
      return;
    }

    res.status(201).json({ success: true, data: response });
  });

  router.post('/api/v1/orders/:orderId/driver-arrived', authMiddleware, requireActiveAndFaceVerified, async (req, res) => {
    let response;
    try {
      response = await grpcClients.order.markDriverArrived({
        order_id: req.params.orderId,
        phone_number: req.body.phoneNumber || '',
        push_token: req.body.pushToken || '',
        id_number_masked: req.body.idNumberMasked || '',
        debt_amount: req.body.debtAmount || 0,
      }, {
        auth: req.auth,
        requestId: getCorrelationId(req),
        correlationId: getCorrelationId(req),
      });
    } catch (error) {
      if (isUpstreamUnavailableError(error)) {
        sendUnavailable(res, 'ORDER_SERVICE_UNAVAILABLE', 'Order service temporarily unavailable');
        return;
      }
      throw error;
    }

    if (!response.success) {
      res.status(400).json({ success: false, error: { code: 'DRIVER_ARRIVAL_FAILED', message: response.message } });
      return;
    }

    res.json({ success: true, data: response });
  });

  router.post('/api/v1/payments/subscribe', async (req, res) => {
    await forwardToPaymentService(req, res, {
      path: '/api/v1/payments/subscribe',
    });
  });

  router.post('/api/v1/payments/order', async (req, res) => {
    await forwardToPaymentService(req, res, {
      path: '/api/v1/payments/order',
    });
  });

  router.post('/api/v1/restaurants/:citySlug/:slug/estimate-delivery-time', async (req, res) => {
    let response;
    try {
      response = await grpcClients.restaurant.estimateDeliveryTime({
        city_slug: req.params.citySlug,
        slug: req.params.slug,
        item_ids: req.body.itemIds || [],
        distance_km: req.body.distanceKm,
        average_speed_kmph: req.body.averageSpeedKmph || 25,
      }, { requestId: getCorrelationId(req), correlationId: getCorrelationId(req) });
    } catch (error) {
      if (isUpstreamUnavailableError(error)) {
        sendUnavailable(res, 'RESTAURANT_SERVICE_UNAVAILABLE', 'Restaurant service temporarily unavailable');
        return;
      }
      throw error;
    }

    if (!response.success) {
      res.status(400).json({ success: false, error: { code: 'ETA_FAILED', message: response.message } });
      return;
    }

    const meta = response.degraded
      ? { degraded: true, reason: 'fallback_estimate' }
      : undefined;
    res.json({ success: true, data: response, meta });
  });

  router.post('/api/v1/face/compare-id', authMiddleware, async (req, res) => {
    let response;
    try {
      response = await grpcClients.face.compareIdWithFace({
        id_card_image_base64: req.body.idCardImageBase64,
        live_image_base64: req.body.liveImageBase64,
        tenant_id: req.body.tenantId || 'global',
        request_id: req.headers['x-request-id'] || '',
      }, {
        auth: req.auth,
        requestId: getCorrelationId(req),
        correlationId: getCorrelationId(req),
      });
    } catch (error) {
      if (isUpstreamUnavailableError(error)) {
        sendUnavailable(
          res,
          'SECURITY_SERVICE_UNAVAILABLE',
          'Security Service Temporarily Unavailable'
        );
        return;
      }
      throw error;
    }

    if (!response.success) {
      res.status(400).json({ success: false, error: { code: 'FACE_COMPARE_FAILED', message: response.message } });
      return;
    }

    res.json({ success: true, data: response });
  });

  return router;
};
