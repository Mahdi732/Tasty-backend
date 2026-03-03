import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  logoutAllSchema,
  startEmailVerificationSchema,
  verifyEmailSchema,
  requestEmailChangeSchema,
} from '../validators/auth.validators.js';

export const buildAuthRoutes = ({ authController, authMiddleware, loginLimiter, refreshLimiter, emailVerificationLimiter }) => {
  const router = Router();

  router.post('/register', loginLimiter, validate(registerSchema), asyncHandler(authController.register));
  router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(authController.login));
  router.post('/refresh', refreshLimiter, validate(refreshSchema), asyncHandler(authController.refresh));
  router.post('/logout', authMiddleware, validate(logoutSchema), asyncHandler(authController.logout));
  router.post('/logout-all', authMiddleware, validate(logoutAllSchema), asyncHandler(authController.logoutAll));
  router.get('/me', authMiddleware, asyncHandler(authController.me));
  router.post(
    '/email/start-verification',
    emailVerificationLimiter,
    validate(startEmailVerificationSchema),
    asyncHandler(authController.startEmailVerification)
  );
  router.post('/email/verify', validate(verifyEmailSchema), asyncHandler(authController.verifyEmail));
  router.post('/email/change/request', validate(requestEmailChangeSchema), asyncHandler(authController.requestEmailChange));

  return router;
};
