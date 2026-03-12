import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';

export const buildHealthRoutes = (healthController) => {
  const router = Router();
  router.get('/v1/health', asyncHandler(healthController.ping));
  return router;
};
