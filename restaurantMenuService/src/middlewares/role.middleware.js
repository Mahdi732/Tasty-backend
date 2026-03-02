import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export const requireRole = (...allowedRoles) => (req, _res, next) => {
  const roles = req.auth?.roles || [];
  const allowed = roles.some((role) => allowedRoles.includes(role));
  if (!allowed) {
    return next(new ApiError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Insufficient permissions'));
  }
  return next();
};
