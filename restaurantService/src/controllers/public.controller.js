import { ok } from '../utils/api-response.js';

export class PublicController {
  constructor(publicService) {
    this.publicService = publicService;
  }

  listRestaurants = async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;

    const result = await this.publicService.listRestaurants({
      page,
      limit,
      citySlug: req.query.citySlug,
      query: req.query.q,
    });

    return ok(res, result.data, 200, result.meta);
  };

  getRestaurant = async (req, res) => {
    const restaurant = await this.publicService.getRestaurant(req.params.citySlug, req.params.slug);
    return ok(res, restaurant);
  };

  getMenu = async (req, res) => {
    const payload = await this.publicService.getRestaurantMenu(
      req.params.citySlug,
      req.params.slug,
      req.query.includeOutOfStock
    );
    return ok(res, payload);
  };

  estimateDeliveryTime = async (req, res) => {
    const estimate = await this.publicService.estimateDeliveryTime(
      req.params.citySlug,
      req.params.slug,
      req.body
    );
    return ok(res, estimate);
  };
}

