import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import { createValidateMiddleware } from '../../../../common/src/middlewares/validate.middleware.js';

export const validate = createValidateMiddleware({
  ApiError,
  validationErrorCode: ERROR_CODES.VALIDATION_ERROR,
});
