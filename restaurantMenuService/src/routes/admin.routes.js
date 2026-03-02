import { Router } from 'express';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ROLES } from '../constants/roles.js';
import {
  restaurantIdParamSchema,
  reviewSchema,
  subscriptionUpdateSchema,
  suspendRestaurantSchema,
} from '../validators/restaurant.validator.js';

export const buildAdminRoutes = (adminController) => {
  const router = Router();
  router.use(requireRole(ROLES.SUPERADMIN));

  router.patch('/restaurants/:id/verify', validate(restaurantIdParamSchema, 'params'), validate(reviewSchema), asyncHandler(adminController.verify));
  router.patch('/restaurants/:id/unverify', validate(restaurantIdParamSchema, 'params'), validate(reviewSchema), asyncHandler(adminController.unverify));
  router.patch('/restaurants/:id/reject', validate(restaurantIdParamSchema, 'params'), validate(reviewSchema), asyncHandler(adminController.rejectVerification));
  router.patch('/restaurants/:id/suspend', validate(restaurantIdParamSchema, 'params'), validate(suspendRestaurantSchema), asyncHandler(adminController.suspend));
  router.patch('/restaurants/:id/unsuspend', validate(restaurantIdParamSchema, 'params'), asyncHandler(adminController.unsuspend));
  router.patch('/restaurants/:id/subscription', validate(restaurantIdParamSchema, 'params'), validate(subscriptionUpdateSchema), asyncHandler(adminController.setSubscription));

  return router;
};
