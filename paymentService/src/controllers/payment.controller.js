import { ok } from '../utils/api-response.js';

const requestHeaders = (req) => ({
  correlationId: req.correlationId || req.requestId || null,
  causationId: req.requestId || null,
});

export class PaymentController {
  constructor(paymentService) {
    this.paymentService = paymentService;
  }

  subscribe = async (req, res) => {
    const result = await this.paymentService.createSubscriptionPayment(req.body, requestHeaders(req));
    return ok(res, result, 201);
  };

  order = async (req, res) => {
    const result = await this.paymentService.createOrderPayment(req.body, requestHeaders(req));
    return ok(res, result, 201);
  };

  webhook = async (req, res) => {
    const result = await this.paymentService.handleWebhook(req.body, requestHeaders(req));
    return ok(res, result, 202);
  };
}
