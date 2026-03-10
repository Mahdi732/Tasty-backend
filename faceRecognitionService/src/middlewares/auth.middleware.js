import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import { createApiKeyAuthMiddleware } from '../../../../common/src/middlewares/auth.middleware.js';

export const serviceAuthMiddleware = (apiKey) => createApiKeyAuthMiddleware({
  ApiError,
  unauthorizedCode: ERROR_CODES.AUTH_UNAUTHORIZED,
  apiKey,
});
