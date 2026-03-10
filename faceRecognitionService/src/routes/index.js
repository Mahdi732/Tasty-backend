import { Router } from 'express';
import { buildHealthRoutes } from './health.routes.js';
import { buildFaceRoutes } from './face.routes.js';

export const buildRoutes = (deps) => {
  const router = Router();

  router.use('/v1', buildHealthRoutes({ healthController: deps.healthController }));
  router.use(
    '/v1/faces',
    buildFaceRoutes({
      faceController: deps.faceController,
      serviceAuthMiddleware: deps.serviceAuthMiddleware,
    })
  );

  return router;
};

