import { EVENTS } from '../constants/messaging.js';

export const registerPaymentConsumer = async ({ rabbitBus, orderService, queueName, logger }) => {
  await rabbitBus.subscribe({
    queue: queueName,
    routingKeys: [EVENTS.PAYMENT_SUCCEEDED, EVENTS.PAYMENT_ORDER_SUCCESS],
    onMessage: async (payload, headers) => {
      if (headers.routingKey === EVENTS.PAYMENT_ORDER_SUCCESS) {
        await orderService.onOrderPaymentSucceeded(payload, headers);
        logger.info({ event: EVENTS.PAYMENT_ORDER_SUCCESS, orderId: payload.orderId }, 'payment_event_processed');
        return;
      }

      await orderService.onPaymentSucceeded(payload, headers);
      logger.info({ event: EVENTS.PAYMENT_SUCCEEDED, resourceId: payload.resourceId }, 'payment_event_processed');
    },
  });
};

