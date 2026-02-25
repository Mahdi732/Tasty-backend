import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  logoutAllSchema,
} from '../validators/auth.validators.js';

export const buildAuthRoutes = ({ authController, authMiddleware, loginLimiter, refreshLimiter }) => {
  const router = Router();

  router.post('/register', loginLimiter, validate(registerSchema), asyncHandler(authController.register));
  router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(authController.login));
  router.post('/refresh', refreshLimiter, validate(refreshSchema), asyncHandler(authController.refresh));
  router.post('/logout', authMiddleware, validate(logoutSchema), asyncHandler(authController.logout));
  router.post('/logout-all', authMiddleware, validate(logoutAllSchema), asyncHandler(authController.logoutAll));
  router.get('/me', authMiddleware, asyncHandler(authController.me));

  return router;
};
