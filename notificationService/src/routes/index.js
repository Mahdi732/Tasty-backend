import { Router } from 'express';
import { buildHealthRoutes } from './health.routes.js';

export const buildRoutes = ({ healthController }) => {
  const router = Router();
  router.use(buildHealthRoutes(healthController));
  return router;
};
