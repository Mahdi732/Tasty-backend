import { Router } from 'express';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ROLES } from '../constants/roles.js';
import {
  createRestaurantSchema,
  restaurantIdParamSchema,
  staffAssignmentSchema,
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

export const buildManagerRoutes = ({ restaurantController, menuController, requireRestaurantManageAccess }) => {
  const router = Router();

  router.post(
    '/restaurants',
    requireRole(ROLES.MANAGER, ROLES.SUPERADMIN),
    validate(createRestaurantSchema),
    asyncHandler(restaurantController.create)
  );
  router.patch(
    '/restaurants/:id',
    requireRole(ROLES.MANAGER, ROLES.SUPERADMIN),
    validate(restaurantIdParamSchema, 'params'),
    requireRestaurantManageAccess,
    validate(updateRestaurantSchema),
    asyncHandler(restaurantController.update)
  );
  router.post(
    '/restaurants/:id/request-publish',
    requireRole(ROLES.MANAGER, ROLES.SUPERADMIN),
    validate(restaurantIdParamSchema, 'params'),
    requireRestaurantManageAccess,
    asyncHandler(restaurantController.requestPublish)
  );
  router.get(
    '/restaurants/:id',
    requireRole(ROLES.MANAGER, ROLES.SUPERADMIN),
    validate(restaurantIdParamSchema, 'params'),
    requireRestaurantManageAccess,
    asyncHandler(restaurantController.getOwnedRestaurant)
  );
  router.post(
    '/restaurants/:id/staff',
    requireRole(ROLES.MANAGER, ROLES.SUPERADMIN),
    validate(restaurantIdParamSchema, 'params'),
    requireRestaurantManageAccess,
    validate(staffAssignmentSchema),
    asyncHandler(restaurantController.addStaff)
  );

  router.post(
    '/restaurants/:id/menu/categories',
    requireRole(ROLES.MANAGER, ROLES.SUPERADMIN, ROLES.STAFF, ROLES.WORKER),
    validate(restaurantIdParamSchema, 'params'),
    requireRestaurantManageAccess,
    validate(createCategorySchema),
    asyncHandler(menuController.createCategory)
  );
  router.get(
    '/restaurants/:id/menu/categories',
    requireRole(ROLES.MANAGER, ROLES.SUPERADMIN, ROLES.STAFF, ROLES.WORKER),
    validate(restaurantIdParamSchema, 'params'),
    requireRestaurantManageAccess,
    asyncHandler(menuController.listCategories)
  );
  router.patch(
    '/restaurants/:id/menu/categories/:categoryId',
    requireRole(ROLES.MANAGER, ROLES.SUPERADMIN, ROLES.STAFF, ROLES.WORKER),
    validate(categoryIdParamSchema, 'params'),
    requireRestaurantManageAccess,
    validate(updateCategorySchema),
    asyncHandler(menuController.updateCategory)
  );
  router.delete(
    '/restaurants/:id/menu/categories/:categoryId',
    requireRole(ROLES.MANAGER, ROLES.SUPERADMIN, ROLES.STAFF, ROLES.WORKER),
    validate(categoryIdParamSchema, 'params'),
    requireRestaurantManageAccess,
    asyncHandler(menuController.deleteCategory)
  );

  router.post(
    '/restaurants/:id/menu/items',
    requireRole(ROLES.MANAGER, ROLES.SUPERADMIN, ROLES.STAFF, ROLES.WORKER),
    validate(restaurantIdParamSchema, 'params'),
    requireRestaurantManageAccess,
    validate(createMenuItemSchema),
    asyncHandler(menuController.createItem)
  );
  router.get(
    '/restaurants/:id/menu/items',
    requireRole(ROLES.MANAGER, ROLES.SUPERADMIN, ROLES.STAFF, ROLES.WORKER),
    validate(restaurantIdParamSchema, 'params'),
    requireRestaurantManageAccess,
    asyncHandler(menuController.listItems)
  );
  router.patch(
    '/restaurants/:id/menu/items/:itemId',
    requireRole(ROLES.MANAGER, ROLES.SUPERADMIN, ROLES.STAFF, ROLES.WORKER),
    validate(itemIdParamSchema, 'params'),
    requireRestaurantManageAccess,
    validate(updateMenuItemSchema),
    asyncHandler(menuController.updateItem)
  );
  router.delete(
    '/restaurants/:id/menu/items/:itemId',
    requireRole(ROLES.MANAGER, ROLES.SUPERADMIN, ROLES.STAFF, ROLES.WORKER),
    validate(itemIdParamSchema, 'params'),
    requireRestaurantManageAccess,
    asyncHandler(menuController.deleteItem)
  );

  router.patch(
    '/menu/items/:id/availability',
    requireRole(ROLES.MANAGER, ROLES.SUPERADMIN, ROLES.STAFF, ROLES.WORKER),
    validate(itemIdParamSchema, 'params'),
    validate(availabilitySchema),
    asyncHandler(menuController.setAvailability)
  );
  router.patch(
    '/menu/items/:id/publish',
    requireRole(ROLES.MANAGER, ROLES.SUPERADMIN, ROLES.STAFF, ROLES.WORKER),
    validate(itemIdParamSchema, 'params'),
    validate(publishSchema),
    asyncHandler(menuController.setPublish)
  );

  return router;
};
