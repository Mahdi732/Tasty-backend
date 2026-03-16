import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  orderPaymentSchema,
  subscribePaymentSchema,
  webhookSchema,
} from '../validators/payment.validator.js';

export const buildPaymentRoutes = ({ paymentController }) => {
  const router = Router();

  router.post('/payments/subscribe', validate(subscribePaymentSchema), asyncHandler(paymentController.subscribe));
  router.post('/payments/order', validate(orderPaymentSchema), asyncHandler(paymentController.order));
  router.post('/payments/webhook', validate(webhookSchema), asyncHandler(paymentController.webhook));

  return router;
};
