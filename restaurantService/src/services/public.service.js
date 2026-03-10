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
}

