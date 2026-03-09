import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export const serviceAuthMiddleware = (apiKey) => (req, _res, next) => {
  const provided = req.get('x-api-key');
  if (!provided || provided !== apiKey) {
    return next(new ApiError(401, ERROR_CODES.AUTH_UNAUTHORIZED, 'Unauthorized service key'));
  }
  return next();
};
