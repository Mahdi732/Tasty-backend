import { Router } from 'express';
import { buildHealthRoutes } from './health.routes.js';
import { buildOrderRoutes } from './order.routes.js';

export const buildRoutes = (deps) => {
  const router = Router();

  router.use('/v1', buildHealthRoutes({ healthController: deps.healthController }));
  router.use(
    '/v1/orders',
    buildOrderRoutes({
      orderController: deps.orderController,
      authMiddleware: deps.authMiddleware,
      requireRole: deps.requireRole,
      requireRestaurantAccess: deps.requireRestaurantAccess,
    })
  );

  return router;
};

