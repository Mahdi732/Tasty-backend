import { Router } from 'express';
import { requireFullyVerifiedAccount } from '../middlewares/auth.middleware.js';
import { env } from '../config/env.js';

export const buildApiRoutes = ({ grpcClients, authMiddleware }) => {
  const router = Router();
  const getCorrelationId = (req) => String(req.correlationId || req.requestId || req.headers['x-request-id'] || '');
  const isUpstreamUnavailableError = (error) => Boolean(error?.isUpstreamUnavailable);

  const normalizeErrorPayload = (payload, fallbackCode, fallbackMessage) => {
    const code = payload?.error?.code || payload?.code || fallbackCode;
    const message = payload?.error?.message || payload?.message || fallbackMessage;
    const userMessage = payload?.error?.userMessage || message;
    const requestId = payload?.error?.requestId;
    return {
      success: false,
      error: {
        code: String(code),
        message: String(message),
        userMessage: String(userMessage),
        requestId: requestId ? String(requestId) : undefined,
      },
    };
  };

  const sendUnavailable = (res, code, message) => {
    res.status(503).json(normalizeErrorPayload(null, code, message));
  };

  const withQueryString = (req, path) => {
    const queryIndex = req.originalUrl.indexOf('?');
    if (queryIndex === -1) {
      return path;
    }

    return `${path}${req.originalUrl.slice(queryIndex)}`;
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

  const forwardToRestaurantService = async (req, res, {
    path,
    method = 'GET',
    unavailableCode = 'RESTAURANT_SERVICE_UNAVAILABLE',
    unavailableMessage = 'Restaurant service temporarily unavailable',
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
      upstream = await fetch(`${env.RESTAURANT_HTTP_BASE_URL}${path}`, {
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
      payload = normalizeErrorPayload(null, 'RESTAURANT_UPSTREAM_INVALID_RESPONSE', 'Invalid upstream response');
    }

    if (!payload?.success) {
      res.status(upstream.status).json(normalizeErrorPayload(payload, 'RESTAURANT_UPSTREAM_ERROR', 'Upstream restaurant error'));
      return;
    }

    res.status(upstream.status).json(payload);
  };

  const forwardToOrderService = async (req, res, {
    path,
    method = 'GET',
    unavailableCode = 'ORDER_SERVICE_UNAVAILABLE',
    unavailableMessage = 'Order service temporarily unavailable',
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
      upstream = await fetch(`${env.ORDER_HTTP_BASE_URL}${path}`, {
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
      payload = normalizeErrorPayload(null, 'ORDER_UPSTREAM_INVALID_RESPONSE', 'Invalid upstream response');
    }

    if (!payload?.success) {
      res.status(upstream.status).json(normalizeErrorPayload(payload, 'ORDER_UPSTREAM_ERROR', 'Upstream order error'));
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
    });
  });

  router.post('/api/v1/auth/refresh', async (req, res) => {
    await forwardToUserService(req, res, {
      path: '/auth/refresh',
    });
  });

  router.post('/api/v1/auth/logout', authMiddleware, async (req, res) => {
    await forwardToUserService(req, res, {
      path: '/auth/logout',
      requiresAuth: true,
    });
  });

  router.post('/api/v1/auth/logout-all', authMiddleware, async (req, res) => {
    await forwardToUserService(req, res, {
      path: '/auth/logout-all',
      requiresAuth: true,
    });
  });

  router.get('/api/v1/auth/sessions', authMiddleware, async (req, res) => {
    await forwardToUserService(req, res, {
      path: '/auth/sessions',
      method: 'GET',
      requiresAuth: true,
    });
  });

  router.delete('/api/v1/auth/sessions/:sessionId', authMiddleware, async (req, res) => {
    await forwardToUserService(req, res, {
      path: `/auth/sessions/${req.params.sessionId}`,
      method: 'DELETE',
      requiresAuth: true,
    });
  });

  router.get('/api/v1/auth/oauth/:provider(google|facebook)/start', async (req, res) => {
    await forwardToUserService(req, res, {
      path: withQueryString(req, `/auth/oauth/${req.params.provider}/start`),
      method: 'GET',
    });
  });

  router.post('/api/v1/auth/oauth/link/:provider(google|facebook)', authMiddleware, async (req, res) => {
    await forwardToUserService(req, res, {
      path: `/auth/oauth/link/${req.params.provider}`,
      requiresAuth: true,
    });
  });

  router.delete('/api/v1/auth/oauth/unlink/:provider(google|facebook)', authMiddleware, async (req, res) => {
    await forwardToUserService(req, res, {
      path: `/auth/oauth/unlink/${req.params.provider}`,
      method: 'DELETE',
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

  router.post('/api/v1/restaurants', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: '/restaurants',
      method: 'POST',
    });
  });

  router.get('/api/v1/restaurants', async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: withQueryString(req, '/restaurants'),
      method: 'GET',
    });
  });

  router.get('/api/v1/restaurants/:citySlug/:slug/menu', async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: withQueryString(req, `/restaurants/${req.params.citySlug}/${req.params.slug}/menu`),
      method: 'GET',
    });
  });

  router.get('/api/v1/restaurants/:citySlug/:slug', async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: withQueryString(req, `/restaurants/${req.params.citySlug}/${req.params.slug}`),
      method: 'GET',
    });
  });

  router.post('/api/v1/manager/restaurants', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: '/restaurants',
      method: 'POST',
    });
  });

  router.get('/api/v1/manager/restaurants', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: '/manager/restaurants',
      method: 'GET',
    });
  });

  router.get('/api/v1/manager/restaurants/:id', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/restaurants/${req.params.id}`,
      method: 'GET',
    });
  });

  router.patch('/api/v1/manager/restaurants/:id', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/restaurants/${req.params.id}`,
      method: 'PATCH',
    });
  });

  router.post('/api/v1/manager/restaurants/:id/request-publish', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/restaurants/${req.params.id}/request-publish`,
      method: 'POST',
    });
  });

  router.post('/api/v1/manager/restaurants/:id/staff', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/restaurants/${req.params.id}/staff`,
      method: 'POST',
    });
  });

  router.post('/api/v1/manager/restaurants/:id/archive', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/restaurants/${req.params.id}/archive`,
      method: 'POST',
    });
  });

  router.post('/api/v1/manager/restaurants/:id/restore/request-fee', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/restaurants/${req.params.id}/restore/request-fee`,
      method: 'POST',
    });
  });

  router.post('/api/v1/manager/restaurants/:id/inventory/low-stock-alert', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/restaurants/${req.params.id}/inventory/low-stock-alert`,
      method: 'POST',
    });
  });

  router.post('/api/v1/manager/restaurants/:id/menu/categories', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/restaurants/${req.params.id}/menu/categories`,
      method: 'POST',
    });
  });

  router.get('/api/v1/manager/restaurants/:id/menu/categories', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/restaurants/${req.params.id}/menu/categories`,
      method: 'GET',
    });
  });

  router.patch('/api/v1/manager/restaurants/:id/menu/categories/:categoryId', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/restaurants/${req.params.id}/menu/categories/${req.params.categoryId}`,
      method: 'PATCH',
    });
  });

  router.delete('/api/v1/manager/restaurants/:id/menu/categories/:categoryId', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/restaurants/${req.params.id}/menu/categories/${req.params.categoryId}`,
      method: 'DELETE',
    });
  });

  router.post('/api/v1/manager/restaurants/:id/menu/items', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/restaurants/${req.params.id}/menu/items`,
      method: 'POST',
    });
  });

  router.get('/api/v1/manager/restaurants/:id/menu/items', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/restaurants/${req.params.id}/menu/items`,
      method: 'GET',
    });
  });

  router.patch('/api/v1/manager/restaurants/:id/menu/items/:itemId', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/restaurants/${req.params.id}/menu/items/${req.params.itemId}`,
      method: 'PATCH',
    });
  });

  router.delete('/api/v1/manager/restaurants/:id/menu/items/:itemId', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/restaurants/${req.params.id}/menu/items/${req.params.itemId}`,
      method: 'DELETE',
    });
  });

  router.patch('/api/v1/manager/menu/items/:id/availability', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/menu/items/${req.params.id}/availability`,
      method: 'PATCH',
    });
  });

  router.patch('/api/v1/manager/menu/items/:id/publish', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/menu/items/${req.params.id}/publish`,
      method: 'PATCH',
    });
  });

  router.patch('/api/v1/admin/restaurants/:id/subscription', authMiddleware, async (req, res) => {
    await forwardToRestaurantService(req, res, {
      path: `/restaurants/${req.params.id}/subscription`,
      method: 'PATCH',
    });
  });

  router.get('/api/v1/orders/me', authMiddleware, async (req, res) => {
    await forwardToOrderService(req, res, {
      path: '/v1/orders/me',
      method: 'GET',
    });
  });

  router.post('/api/v1/orders/:orderId/cancel', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToOrderService(req, res, {
      path: `/v1/orders/${req.params.orderId}/cancel`,
      method: 'POST',
    });
  });

  router.get('/api/v1/account/debt-status', authMiddleware, async (req, res) => {
    await forwardToOrderService(req, res, {
      path: '/v1/orders/debts/me',
      method: 'GET',
    });
  });

  router.get('/api/v1/ops/orders/restaurant/:restaurantId', authMiddleware, async (req, res) => {
    await forwardToOrderService(req, res, {
      path: `/v1/orders/restaurant/${req.params.restaurantId}`,
      method: 'GET',
    });
  });

  router.get('/api/v1/ops/orders/admin/all', authMiddleware, async (req, res) => {
    await forwardToOrderService(req, res, {
      path: '/v1/orders/admin/all',
      method: 'GET',
    });
  });

  router.post('/api/v1/ops/orders/qr/scan', authMiddleware, async (req, res) => {
    await forwardToOrderService(req, res, {
      path: '/v1/orders/qr/scan',
      method: 'POST',
    });
  });

  // Crucial fraud gate: ordering is blocked unless account is fully verified.
  router.post('/api/v1/orders', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
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

  router.post('/api/v1/orders/:orderId/driver-arrived', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
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

  router.post('/api/v1/payments/subscribe', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
    await forwardToPaymentService(req, res, {
      path: '/api/v1/payments/subscribe',
    });
  });

  router.post('/api/v1/payments/order', authMiddleware, requireFullyVerifiedAccount, async (req, res) => {
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
