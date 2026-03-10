import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { citySlugParamSchema, paginationQuerySchema } from '../validators/restaurant.validator.js';

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

  return router;
};

