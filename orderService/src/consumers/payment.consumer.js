import { EVENTS } from '../constants/messaging.js';

export const registerPaymentConsumer = async ({ rabbitBus, orderService, queueName, logger }) => {
  await rabbitBus.subscribe({
    queue: queueName,
    routingKeys: [EVENTS.PAYMENT_SUCCEEDED],
    onMessage: async (payload, headers) => {
      await orderService.onPaymentSucceeded(payload, headers);
      logger.info({ event: EVENTS.PAYMENT_SUCCEEDED, resourceId: payload.resourceId }, 'payment_event_processed');
    },
  });
};

