import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export const enforceTenantScope = (tenantExtractor) => (req, _res, next) => {
  const resourceTenantId = tenantExtractor(req);
  if (!resourceTenantId || req.auth?.tenantId === resourceTenantId || req.auth?.roles?.includes('superadmin')) {
    return next();
  }
  return next(new ApiError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Tenant scope violation'));
};
