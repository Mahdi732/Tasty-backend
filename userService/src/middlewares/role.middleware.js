import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export const requireRoles = (...acceptedRoles) => (req, _res, next) => {
  const roles = req.auth?.roles || [];
  if (!roles.some((role) => acceptedRoles.includes(role))) {
    return next(new ApiError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Insufficient role')); 
  }
  return next();
};
