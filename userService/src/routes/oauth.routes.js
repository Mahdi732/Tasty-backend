import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validate } from '../middlewares/validate.middleware.js';
import { oauthStartQuerySchema, oauthCallbackQuerySchema } from '../validators/oauth.validators.js';

export const buildOauthRoutes = ({ oauthController, authMiddleware }) => {
  const router = Router();

  router.get('/oauth/:provider/start', validate(oauthStartQuerySchema, 'query'), asyncHandler(oauthController.start));
  router.get('/oauth/:provider/callback', validate(oauthCallbackQuerySchema, 'query'), asyncHandler(oauthController.callback));

  router.post('/oauth/link/:provider', authMiddleware, asyncHandler(oauthController.link));
  router.delete('/oauth/unlink/:provider', authMiddleware, asyncHandler(oauthController.unlink));

  return router;
};
