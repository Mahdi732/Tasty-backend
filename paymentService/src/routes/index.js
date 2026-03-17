import { Router } from 'express';
import { buildHealthRoutes } from './health.routes.js';
import { buildPaymentRoutes } from './payment.routes.js';

export const buildRoutes = ({ healthController, paymentController }) => {
  const router = Router();

  router.use('/api/v1', buildHealthRoutes({ healthController }));
  router.use('/api/v1', buildPaymentRoutes({ paymentController }));

  return router;
};
