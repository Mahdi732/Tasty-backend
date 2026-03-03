import { fail } from '../utils/api-response.js';
import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export const errorMiddleware = (logger) => (err, req, res, _next) => {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const code = err instanceof ApiError ? err.code : ERROR_CODES.INTERNAL_ERROR;
  const message = err instanceof ApiError ? err.message : 'Internal server error';

  logger.error({ err, requestId: req.requestId, path: req.path }, 'request_failed');

  return fail(res, statusCode, {
    code,
    message,
    requestId: req.requestId,
    details: err instanceof ApiError ? err.details : undefined,
  }, err instanceof ApiError ? err.meta : undefined);
};
