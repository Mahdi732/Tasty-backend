import { fail } from '../utils/api-response.js';
import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import { createErrorMiddleware } from '../../../common/src/middlewares/error.middleware.js';

export const errorMiddleware = (logger) => createErrorMiddleware({
  logger,
  ApiError,
  fail,
  internalErrorCode: ERROR_CODES.INTERNAL_ERROR,
});

