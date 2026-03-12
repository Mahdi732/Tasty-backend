import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createOrderSchema,
  driverArrivedSchema,
  orderIdParamSchema,
  restaurantOrdersParamSchema,
  scanQrSchema,
} from '../validators/order.validator.js';
import { ROLES } from '../constants/roles.js';

export const buildOrderRoutes = ({
  orderController,
  authMiddleware,
  requireRole,
  requireRestaurantAccess,
}) => {
  const router = Router();

  router.use(authMiddleware);

  router.post('/me', validate(createOrderSchema), asyncHandler(orderController.create));
  router.get('/me', asyncHandler(orderController.myOrders));

  router.get(
    '/restaurant/:restaurantId',
    validate(restaurantOrdersParamSchema, 'params'),
    requireRole(ROLES.STAFF, ROLES.MANAGER, ROLES.DELIVERY_MAN, ROLES.SUPERADMIN),
    requireRestaurantAccess,
    asyncHandler(orderController.restaurantOrders)
  );

  router.get('/admin/all', requireRole(ROLES.SUPERADMIN), asyncHandler(orderController.listAll));

  router.post(
    '/qr/scan',
    validate(scanQrSchema),
    requireRole(ROLES.STAFF, ROLES.MANAGER, ROLES.DELIVERY_MAN, ROLES.SUPERADMIN),
    asyncHandler(orderController.scanQr)
  );

  router.post(
    '/:orderId/driver-arrived',
    validate(orderIdParamSchema, 'params'),
    validate(driverArrivedSchema),
    requireRole(ROLES.DELIVERY_MAN, ROLES.SUPERADMIN),
    asyncHandler(orderController.markDriverArrived)
  );

  return router;
};

