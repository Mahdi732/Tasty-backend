import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source] || {});
  if (!result.success) {
    return next(new ApiError(400, ERROR_CODES.VALIDATION_ERROR, 'Validation error', result.error.flatten()));
  }
  req[source] = result.data;
  return next();
};
