import { registerPaymentConsumer } from './payment.consumer.js';
import { registerRestaurantMembershipConsumer } from './restaurant-membership.consumer.js';

export const registerConsumers = async ({
  rabbitBus,
  orderService,
  membershipRepository,
  processedEventRepository,
  logger,
  paymentQueue,
  membershipQueue,
}) => {
  await registerPaymentConsumer({
    rabbitBus,
    orderService,
    queueName: paymentQueue,
    logger,
  });

  await registerRestaurantMembershipConsumer({
    rabbitBus,
    membershipRepository,
    processedEventRepository,
    queueName: membershipQueue,
    logger,
  });
};
