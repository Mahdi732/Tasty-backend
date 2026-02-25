import { Router } from 'express';
import { buildHealthRoutes } from './health.routes.js';
import { buildAuthRoutes } from './auth.routes.js';
import { buildOauthRoutes } from './oauth.routes.js';
import { buildSessionRoutes } from './session.routes.js';
import { asyncHandler } from '../utils/async-handler.js';

export const buildRoutes = (deps) => {
  const router = Router();

  router.use(buildHealthRoutes(deps.healthController));
  router.get('/.well-known/jwks.json', asyncHandler(deps.authMetaController.jwks));

  router.use('/auth', buildAuthRoutes(deps));
  router.use('/auth', buildOauthRoutes(deps));
  router.use('/auth', buildSessionRoutes(deps));

  return router;
};
