import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export const validate = (schema, source = 'body') => (req, _res, next) => {
  const target = req[source] || {};
  const result = schema.safeParse(target);
  if (!result.success) {
    return next(
      new ApiError(400, ERROR_CODES.VALIDATION_ERROR, 'Validation error', result.error.flatten())
    );
  }
  req[source] = result.data;
  return next();
};
