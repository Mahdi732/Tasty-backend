import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validate } from '../middlewares/validate.middleware.js';
import { sessionParamSchema } from '../validators/session.validators.js';

export const buildSessionRoutes = ({ sessionController, authMiddleware }) => {
  const router = Router();

  router.get('/sessions', authMiddleware, asyncHandler(sessionController.list));
  router.delete(
    '/sessions/:sessionId',
    authMiddleware,
    validate(sessionParamSchema, 'params'),
    asyncHandler(sessionController.revoke)
  );

  return router;
};

