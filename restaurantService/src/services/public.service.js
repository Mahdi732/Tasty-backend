import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export class PublicService {
  constructor({ restaurantService, projectionService }) {
    this.restaurantService = restaurantService;
    this.projectionService = projectionService;
  }

  listRestaurants(params) {
    return this.restaurantService.listPublicRestaurants(params);
  }

  getRestaurant(citySlug, slug) {
    return this.restaurantService.getPublicRestaurantByCitySlug(citySlug, slug);
  }

  async getRestaurantMenu(citySlug, slug, includeOutOfStock = false) {
    await this.restaurantService.getPublicRestaurantByCitySlug(citySlug, slug);

    const projection = await this.projectionService.getPublicMenu(citySlug, slug);
    if (!projection) {
      throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Menu not available');
    }

    if (includeOutOfStock) {
      return projection;
    }

    return {
      ...projection,
      categories: projection.categories.map((category) => ({
        ...category,
        items: category.items.filter((item) => item.availability === 'IN_STOCK'),
      })),
    };
  }

  async estimateDeliveryTime(citySlug, slug, payload) {
    const projection = await this.getRestaurantMenu(citySlug, slug, true);
    const requestedItemIds = new Set(payload.itemIds.map(String));
    const matchedItems = projection.categories
      .flatMap((category) => category.items)
      .filter((item) => requestedItemIds.has(String(item.id)));

    if (!matchedItems.length) {
      throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'No matching menu items for ETA calculation');
    }

    const maxPrepTimeMinutes = matchedItems.reduce((max, item) => {
      const prep = Number(item.averagePrepTime || 15);
      return prep > max ? prep : max;
    }, 0);

    const travelMinutes = Math.ceil((payload.distanceKm / payload.averageSpeedKmph) * 60);
    const estimatedDeliveryMinutes = maxPrepTimeMinutes + travelMinutes;

    return {
      maxPrepTimeMinutes,
      travelMinutes,
      estimatedDeliveryMinutes,
    };
  }
}

