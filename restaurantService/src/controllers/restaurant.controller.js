import { ok } from '../utils/api-response.js';

export class RestaurantController {
  constructor(restaurantService) {
    this.restaurantService = restaurantService;
  }

  create = async (req, res) => {
    const restaurant = await this.restaurantService.createRestaurant(req.auth, req.body);
    return ok(res, restaurant, 201);
  };

  update = async (req, res) => {
    const restaurant = await this.restaurantService.updateRestaurant(req.params.id, req.auth, req.body);
    return ok(res, restaurant);
  };

  requestPublish = async (req, res) => {
    const restaurant = await this.restaurantService.requestPublish(req.params.id, req.auth);
    return ok(res, restaurant);
  };

  getOwnedRestaurant = async (req, res) => {
    const restaurant = await this.restaurantService.getManagerRestaurant(req.params.id, req.auth);
    return ok(res, restaurant);
  };

  addStaff = async (req, res) => {
    const mapping = await this.restaurantService.addStaffMember(req.params.id, req.auth, req.body);
    return ok(res, mapping, 201);
  };

  archive = async (req, res) => {
    const restaurant = await this.restaurantService.archiveRestaurant(req.params.id, req.auth);
    return ok(res, restaurant);
  };

  requestRestore = async (req, res) => {
    const restaurant = await this.restaurantService.requestRestoreFee(req.params.id, req.auth, req.body);
    return ok(res, restaurant);
  };

  triggerLowStockAlert = async (req, res) => {
    const result = await this.restaurantService.triggerLowStockAlert(req.params.id, req.auth, req.body);
    return ok(res, result, 202);
  };
}

