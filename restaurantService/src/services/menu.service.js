import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import { ROLES } from '../constants/roles.js';

export class MenuService {
  constructor({
    restaurantRepository,
    restaurantUserRepository,
    categoryRepository,
    itemRepository,
    optionGroupRepository,
    optionItemRepository,
    projectionService,
  }) {
    this.restaurantRepository = restaurantRepository;
    this.restaurantUserRepository = restaurantUserRepository;
    this.categoryRepository = categoryRepository;
    this.itemRepository = itemRepository;
    this.optionGroupRepository = optionGroupRepository;
    this.optionItemRepository = optionItemRepository;
    this.projectionService = projectionService;
  }

  async ensureManageAccess(restaurantId, auth) {
    if (auth.roles.includes(ROLES.SUPERADMIN)) return;
    const owns = await this.restaurantUserRepository.hasRestaurantAccess(restaurantId, auth.userId);
    if (!owns) {
      throw new ApiError(403, ERROR_CODES.TENANT_ACCESS_DENIED, 'Access denied for this restaurant');
    }
  }

  async createCategory(restaurantId, auth, payload) {
    const category = await this.categoryRepository.create({ ...payload, restaurantId });
    await this.projectionService.rebuildForRestaurant(restaurantId);
    return category;
  }

  async listCategories(restaurantId, auth) {
    return this.categoryRepository.listByRestaurant(restaurantId);
  }

  async updateCategory(restaurantId, categoryId, auth, payload) {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category || String(category.restaurantId) !== String(restaurantId)) {
      throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Category not found');
    }

    const updated = await this.categoryRepository.updateById(categoryId, payload);
    await this.projectionService.rebuildForRestaurant(restaurantId);
    return updated;
  }

  async deleteCategory(restaurantId, categoryId, auth) {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category || String(category.restaurantId) !== String(restaurantId)) {
      throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Category not found');
    }

    await this.categoryRepository.softDelete(categoryId);
    await this.projectionService.rebuildForRestaurant(restaurantId);
    return { deleted: true };
  }

  async createItem(restaurantId, auth, payload) {
    const category = await this.categoryRepository.findById(payload.categoryId);
    if (!category || String(category.restaurantId) !== String(restaurantId)) {
      throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Category not found');
    }

    const optionGroupIds = [];
    if (Array.isArray(payload.optionGroups) && payload.optionGroups.length) {
      for (const groupInput of payload.optionGroups) {
        const group = await this.optionGroupRepository.create({
          restaurantId,
          name: groupInput.name,
          required: groupInput.required,
          multiSelect: groupInput.multiSelect,
          minSelect: groupInput.minSelect,
          maxSelect: groupInput.maxSelect,
          sortOrder: groupInput.sortOrder,
        });

        optionGroupIds.push(group._id);

        if (Array.isArray(groupInput.items) && groupInput.items.length) {
          await this.optionItemRepository.createMany(
            groupInput.items.map((item) => ({
              optionGroupId: group._id,
              name: item.name,
              priceDelta: item.priceDelta,
              sortOrder: item.sortOrder,
              isActive: true,
            }))
          );
        }
      }
    }

    const item = await this.itemRepository.create({
      ...payload,
      restaurantId,
      optionGroupIds,
      optionGroups: undefined,
    });

    await this.projectionService.rebuildForRestaurant(restaurantId);
    return item;
  }

  async listItems(restaurantId, auth) {
    return this.itemRepository.listByRestaurant(restaurantId);
  }

  async updateItem(restaurantId, itemId, auth, payload) {
    const item = await this.itemRepository.findById(itemId);
    if (!item || String(item.restaurantId) !== String(restaurantId)) {
      throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Menu item not found');
    }

    const updated = await this.itemRepository.updateById(itemId, payload);
    await this.projectionService.rebuildForRestaurant(restaurantId);
    return updated;
  }

  async deleteItem(restaurantId, itemId, auth) {
    const item = await this.itemRepository.findById(itemId);
    if (!item || String(item.restaurantId) !== String(restaurantId)) {
      throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Menu item not found');
    }

    await this.itemRepository.softDelete(itemId);
    await this.projectionService.rebuildForRestaurant(restaurantId);
    return { deleted: true };
  }

  async setAvailability(itemId, auth, availability) {
    const item = await this.itemRepository.findById(itemId);
    if (!item) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Menu item not found');

    await this.ensureManageAccess(item.restaurantId, auth);
    const updated = await this.itemRepository.updateById(itemId, { availability });
    await this.projectionService.rebuildForRestaurant(item.restaurantId);
    return updated;
  }

  async setPublish(itemId, auth, isPublished) {
    const item = await this.itemRepository.findById(itemId);
    if (!item) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Menu item not found');

    await this.ensureManageAccess(item.restaurantId, auth);
    const updated = await this.itemRepository.updateById(itemId, { isPublished });
    await this.projectionService.rebuildForRestaurant(item.restaurantId);
    return updated;
  }
}

