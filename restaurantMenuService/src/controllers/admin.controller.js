import { ok } from '../utils/api-response.js';

export class AdminController {
  constructor(restaurantService) {
    this.restaurantService = restaurantService;
  }

  verify = async (req, res) => {
    const restaurant = await this.restaurantService.verifyRestaurant(
      req.params.id,
      req.auth,
      req.body.reviewNotes
    );
    return ok(res, restaurant);
  };

  unverify = async (req, res) => {
    const restaurant = await this.restaurantService.unverifyRestaurant(
      req.params.id,
      req.auth,
      req.body.reviewNotes
    );
    return ok(res, restaurant);
  };

  rejectVerification = async (req, res) => {
    const restaurant = await this.restaurantService.rejectVerification(
      req.params.id,
      req.auth,
      req.body.reviewNotes
    );
    return ok(res, restaurant);
  };

  suspend = async (req, res) => {
    const restaurant = await this.restaurantService.suspendRestaurant(
      req.params.id,
      req.auth,
      req.body.reason
    );
    return ok(res, restaurant);
  };

  unsuspend = async (req, res) => {
    const restaurant = await this.restaurantService.unsuspendRestaurant(req.params.id, req.auth);
    return ok(res, restaurant);
  };

  setSubscription = async (req, res) => {
    const payload = {
      ...req.body,
      currentPeriodEnd: req.body.currentPeriodEnd ? new Date(req.body.currentPeriodEnd) : undefined,
      trialEndsAt: req.body.trialEndsAt ? new Date(req.body.trialEndsAt) : undefined,
    };
    const restaurant = await this.restaurantService.updateSubscription(req.params.id, req.auth, payload);
    return ok(res, restaurant);
  };
}
