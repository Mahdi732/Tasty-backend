import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import { ROLES } from '../constants/roles.js';

export const requireRestaurantAccess = ({ membershipRepository, restaurantIdExtractor }) => async (req, _res, next) => {
  try {
    if (req.auth?.roles?.includes(ROLES.SUPERADMIN)) return next();

    const restaurantId = restaurantIdExtractor(req);
    if (!restaurantId) {
      return next(new ApiError(400, ERROR_CODES.VALIDATION_ERROR, 'Restaurant id is required'));
    }

    const hasAccess = await membershipRepository.hasRestaurantAccess(restaurantId, req.auth?.userId);
    if (!hasAccess) {
      return next(new ApiError(403, ERROR_CODES.TENANT_ACCESS_DENIED, 'Access denied for this restaurant'));
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
