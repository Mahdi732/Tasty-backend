import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

const PASSWORD_REGEX = {
  upper: /[A-Z]/,
  lower: /[a-z]/,
  digit: /\d/,
  special: /[^A-Za-z0-9]/,
};

export const assertStrongPassword = (password) => {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw new ApiError(400, ERROR_CODES.VALIDATION_ERROR, 'Password must be 12-128 characters long');
  }

  if (
    !PASSWORD_REGEX.upper.test(password) ||
    !PASSWORD_REGEX.lower.test(password) ||
    !PASSWORD_REGEX.digit.test(password) ||
    !PASSWORD_REGEX.special.test(password)
  ) {
    throw new ApiError(
      400,
      ERROR_CODES.VALIDATION_ERROR,
      'Password must include uppercase, lowercase, number, and special character'
    );
  }
};

