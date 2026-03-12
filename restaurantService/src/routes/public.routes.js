import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { citySlugParamSchema, estimateDeliveryTimeSchema, paginationQuerySchema } from '../validators/restaurant.validator.js';

export const buildPublicRoutes = (publicController) => {
  const router = Router();

  router.get('/restaurants', validate(paginationQuerySchema, 'query'), asyncHandler(publicController.listRestaurants));
  router.get(
    '/restaurants/:citySlug/:slug',
    validate(citySlugParamSchema, 'params'),
    asyncHandler(publicController.getRestaurant)
  );
  router.get(
    '/restaurants/:citySlug/:slug/menu',
    validate(citySlugParamSchema, 'params'),
    validate(paginationQuerySchema, 'query'),
    asyncHandler(publicController.getMenu)
  );
  router.post(
    '/restaurants/:citySlug/:slug/estimate-delivery-time',
    validate(citySlugParamSchema, 'params'),
    validate(estimateDeliveryTimeSchema),
    asyncHandler(publicController.estimateDeliveryTime)
  );

  return router;
};

