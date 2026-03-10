import { ok } from '../utils/api-response.js';

export class OrderController {
  constructor(orderService) {
    this.orderService = orderService;
  }

  placeOrder = async (req, res) => {
    const order = await this.orderService.placeOrder(req.auth, req.body);
    return ok(res, order, 201);
  };

  listMyOrders = async (req, res) => {
    const orders = await this.orderService.listMyOrders(req.auth);
    return ok(res, orders);
  };

  listRestaurantOrders = async (req, res) => {
    const orders = await this.orderService.listRestaurantOrders(req.params.restaurantId, req.auth);
    return ok(res, orders);
  };

  listAll = async (_req, res) => {
    const orders = await this.orderService.listAllOrders();
    return ok(res, orders);
  };
}

