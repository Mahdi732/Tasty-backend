import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { ROLES } from '../constants/roles.js';
import { createOrderSchema, restaurantOrdersParamSchema } from '../validators/order.validator.js';

export const buildOrderRoutes = ({ orderController, requireRestaurantOrderAccess }) => {
  const router = Router();

  router.post(
    '/orders',
    requireRole(ROLES.USER, ROLES.MANAGER, ROLES.STAFF, ROLES.WORKER, ROLES.SUPERADMIN),
    validate(createOrderSchema),
    asyncHandler(orderController.placeOrder)
  );

  router.get('/orders/me', asyncHandler(orderController.listMyOrders));

  router.get(
    '/orders/restaurant/:restaurantId',
    requireRole(ROLES.MANAGER, ROLES.STAFF, ROLES.WORKER, ROLES.SUPERADMIN),
    validate(restaurantOrdersParamSchema, 'params'),
    requireRestaurantOrderAccess,
    asyncHandler(orderController.listRestaurantOrders)
  );

  router.get('/admin/orders', requireRole(ROLES.SUPERADMIN), asyncHandler(orderController.listAll));

  return router;
};

