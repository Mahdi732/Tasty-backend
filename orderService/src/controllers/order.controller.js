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

  cancelMyOrder = async (req, res) => {
    const order = await this.orderService.cancelMyOrder(req.params.orderId, req.auth, buildEventHeaders(req));
    return ok(res, order);
  };

  myOrders = async (req, res) => {
    const orders = await this.orderService.listMyOrders(req.auth);
    return ok(res, orders);
  };

  myDebtStatus = async (req, res) => {
    const debtStatus = await this.orderService.getMyDebtStatus(req.auth);
    return ok(res, debtStatus);
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

  markDriverArrived = async (req, res) => {
    const updated = await this.orderService.markDriverArrived(
      req.params.orderId,
      req.auth,
      req.body,
      buildEventHeaders(req)
    );
    return ok(res, updated);
  };
}

