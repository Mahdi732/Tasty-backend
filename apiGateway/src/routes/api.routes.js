import { Router } from 'express';
import { requireActiveAndFaceVerified } from '../middlewares/auth.middleware.js';

export const buildApiRoutes = ({ grpcClients, authMiddleware }) => {
  const router = Router();
  const getCorrelationId = (req) => String(req.correlationId || req.requestId || req.headers['x-request-id'] || '');
  const isUpstreamUnavailableError = (error) => Boolean(error?.isUpstreamUnavailable);

  const sendUnavailable = (res, code, message) => {
    res.status(503).json({
      success: false,
      error: {
        code,
        message,
      },
    });
  };

  router.post('/api/v1/auth/register', async (req, res) => {
    let response;
    try {
      response = await grpcClients.user.registerUser({
        email: req.body.email,
        password: req.body.password,
        phone_number: req.body.phoneNumber,
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
    let response;
    try {
      response = await grpcClients.user.loginUser({
        email: req.body.email,
        password: req.body.password,
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
      res.status(401).json({ success: false, error: { code: 'LOGIN_FAILED', message: response.message } });
      return;
    }

    res.json({ success: true, data: response });
  });

  router.get('/api/v1/auth/profile', authMiddleware, async (req, res) => {
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
      res.status(404).json({ success: false, error: { code: 'PROFILE_NOT_FOUND', message: response.message } });
      return;
    }
    res.json({ success: true, data: response });
  });

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
