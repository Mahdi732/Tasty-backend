import { ok } from '../utils/api-response.js';
import { buildEventHeaders } from '../utils/request-context.js';

export class OrderController {
  constructor(orderService) {
    this.orderService = orderService;
  }

  create = async (req, res) => {
    const order = await this.orderService.createOrder(req.auth, req.body, buildEventHeaders(req));
    return ok(res, order, 201);
  };

  myOrders = async (req, res) => {
    const orders = await this.orderService.listMyOrders(req.auth);
    return ok(res, orders);
  };

  restaurantOrders = async (req, res) => {
    const orders = await this.orderService.listRestaurantOrders(req.params.restaurantId, req.auth);
    return ok(res, orders);
  };

  listAll = async (_req, res) => {
    const orders = await this.orderService.listAllOrders();
    return ok(res, orders);
  };

  scanQr = async (req, res) => {
    const updated = await this.orderService.scanQr(req.body.qrToken, req.auth, buildEventHeaders(req));
    return ok(res, updated);
  };
}

