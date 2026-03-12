import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import { createValidateMiddleware } from '../../../common/src/middlewares/validate.middleware.js';

export const validate = createValidateMiddleware({
  createValidationError: (details) => new ApiError(400, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', details),
});
