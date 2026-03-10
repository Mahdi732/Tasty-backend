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
});

