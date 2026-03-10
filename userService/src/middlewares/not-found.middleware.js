import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export const notFoundMiddleware = (_req, _res, next) => {
  next(new ApiError(404, ERROR_CODES.VALIDATION_ERROR, 'Route not found'));
};

