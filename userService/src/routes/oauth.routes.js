import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  oauthStartQuerySchema,
  oauthCallbackQuerySchema,
  oauthLinkBodySchema,
} from '../validators/oauth.validators.js';

export const buildOauthRoutes = ({ oauthController, authMiddleware }) => {
  const router = Router();

  router.get(
    '/oauth/:provider(google|facebook)/start',
    validate(oauthStartQuerySchema, 'query'),
    asyncHandler(oauthController.start)
  );
  router.get(
    '/oauth/:provider(google|facebook)/callback',
    validate(oauthCallbackQuerySchema, 'query'),
    asyncHandler(oauthController.callback)
  );

  router.post(
    '/oauth/link/:provider(google|facebook)',
    authMiddleware,
    validate(oauthLinkBodySchema),
    asyncHandler(oauthController.link)
  );
  router.delete('/oauth/unlink/:provider(google|facebook)', authMiddleware, asyncHandler(oauthController.unlink));

  return router;
};

