import { Router } from 'express';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ROLES } from '../constants/roles.js';
import {
  createRestaurantSchema,
  restaurantIdParamSchema,
  updateRestaurantSchema,
} from '../validators/restaurant.validator.js';
import {
  categoryIdParamSchema,
  itemIdParamSchema,
  availabilitySchema,
  createCategorySchema,
  createMenuItemSchema,
  publishSchema,
  updateCategorySchema,
  updateMenuItemSchema,
} from '../validators/menu.validator.js';

export const buildManagerRoutes = ({ restaurantController, menuController }) => {
  const router = Router();

  router.use(requireRole(ROLES.MANAGER, ROLES.SUPERADMIN));

  router.post('/restaurants', validate(createRestaurantSchema), asyncHandler(restaurantController.create));
  router.patch(
    '/restaurants/:id',
    validate(restaurantIdParamSchema, 'params'),
    validate(updateRestaurantSchema),
    asyncHandler(restaurantController.update)
  );
  router.post(
    '/restaurants/:id/request-publish',
    validate(restaurantIdParamSchema, 'params'),
    asyncHandler(restaurantController.requestPublish)
  );
  router.get(
    '/restaurants/:id',
    validate(restaurantIdParamSchema, 'params'),
    asyncHandler(restaurantController.getOwnedRestaurant)
  );

  router.post(
    '/restaurants/:id/menu/categories',
    validate(restaurantIdParamSchema, 'params'),
    validate(createCategorySchema),
    asyncHandler(menuController.createCategory)
  );
  router.get(
    '/restaurants/:id/menu/categories',
    validate(restaurantIdParamSchema, 'params'),
    asyncHandler(menuController.listCategories)
  );
  router.patch(
    '/restaurants/:id/menu/categories/:categoryId',
    validate(categoryIdParamSchema, 'params'),
    validate(updateCategorySchema),
    asyncHandler(menuController.updateCategory)
  );
  router.delete(
    '/restaurants/:id/menu/categories/:categoryId',
    validate(categoryIdParamSchema, 'params'),
    asyncHandler(menuController.deleteCategory)
  );

  router.post(
    '/restaurants/:id/menu/items',
    validate(restaurantIdParamSchema, 'params'),
    validate(createMenuItemSchema),
    asyncHandler(menuController.createItem)
  );
  router.get(
    '/restaurants/:id/menu/items',
    validate(restaurantIdParamSchema, 'params'),
    asyncHandler(menuController.listItems)
  );
  router.patch(
    '/restaurants/:id/menu/items/:itemId',
    validate(itemIdParamSchema, 'params'),
    validate(updateMenuItemSchema),
    asyncHandler(menuController.updateItem)
  );
  router.delete(
    '/restaurants/:id/menu/items/:itemId',
    validate(itemIdParamSchema, 'params'),
    asyncHandler(menuController.deleteItem)
  );

  router.patch(
    '/menu/items/:id/availability',
    validate(itemIdParamSchema, 'params'),
    validate(availabilitySchema),
    asyncHandler(menuController.setAvailability)
  );
  router.patch(
    '/menu/items/:id/publish',
    validate(itemIdParamSchema, 'params'),
    validate(publishSchema),
    asyncHandler(menuController.setPublish)
  );

  return router;
};
