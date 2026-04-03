import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import { createJwtAuthMiddleware } from '../../../common/src/middlewares/auth.middleware.js';

export const authMiddleware = (jwtVerifier) => createJwtAuthMiddleware({
  buildUnauthorizedError: () => new ApiError(401, ERROR_CODES.AUTH_UNAUTHORIZED, 'Authentication required'),
  verifyAccessToken: async (token) => {
    try {
      return await jwtVerifier.verifyAccessToken(token);
    } catch {
      throw new ApiError(401, ERROR_CODES.AUTH_UNAUTHORIZED, 'Authentication required');
    }
  },
  onAuthenticated: async (req, payload) => {
    if (
      payload?.status !== 'ACTIVE'
      || payload?.verification?.email !== true
      || payload?.verification?.phone !== true
      || payload?.verification?.face !== true
    ) {
      throw new ApiError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Complete account verification before accessing orders');
    }
    req.auth.status = payload?.status;
    req.auth.verification = payload?.verification || {};
  },
});

