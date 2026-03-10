import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';

export const buildHealthRoutes = ({ healthController }) => {
  const router = Router();

  router.get('/health', asyncHandler(healthController.health));
  router.get('/ready', asyncHandler(healthController.ready));

  return router;
};

