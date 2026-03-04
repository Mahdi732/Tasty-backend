import { Router } from 'express';
import { buildHealthRoutes } from './health.routes.js';
import { buildPublicRoutes } from './public.routes.js';
import { buildManagerRoutes } from './manager.routes.js';
import { buildAdminRoutes } from './admin.routes.js';
import { buildOrderRoutes } from './order.routes.js';

export const buildRoutes = ({
  healthController,
  publicController,
  restaurantController,
  menuController,
  orderController,
  adminController,
  authMiddleware,
  requireRestaurantManageAccess,
  requireRestaurantOrderAccess,
}) => {
  const router = Router();

  router.use(buildHealthRoutes(healthController));
  router.use(buildPublicRoutes(publicController));

  router.use(authMiddleware);
  router.use(buildManagerRoutes({ restaurantController, menuController, requireRestaurantManageAccess }));
  router.use(buildOrderRoutes({ orderController, requireRestaurantOrderAccess }));
  router.use(buildAdminRoutes(adminController));

  return router;
};
