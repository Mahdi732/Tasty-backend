import { EVENTS } from '../constants/messaging.js';

const mapMembershipPayload = (payload) => ({
  userId: String(payload.userId || payload.staffUserId || payload.managerUserId || ''),
  restaurantId: String(payload.restaurantId || ''),
  role: String(payload.role || 'STAFF').toUpperCase(),
});

export const registerRestaurantMembershipConsumer = async ({
  rabbitBus,
  membershipRepository,
  processedEventRepository,
  queueName,
  logger,
}) => {
  await rabbitBus.subscribe({
    queue: queueName,
    routingKeys: [EVENTS.RESTAURANT_STAFF_ASSIGNED, EVENTS.RESTAURANT_STAFF_REMOVED],
    onMessage: async (payload, headers) => {
      const eventId = headers.eventId;
      if (await processedEventRepository.isProcessed(eventId)) return;

      const mapping = mapMembershipPayload(payload);
      if (!mapping.userId || !mapping.restaurantId) {
        logger.warn({ payload }, 'invalid_membership_event_payload');
        await processedEventRepository.markProcessed(eventId, 'restaurant.membership.invalid');
        return;
      }

      if (payload.removed === true || headers.routingKey === EVENTS.RESTAURANT_STAFF_REMOVED) {
        await membershipRepository.deleteMapping(mapping);
      } else {
        await membershipRepository.upsertMapping(mapping);
      }

      await processedEventRepository.markProcessed(eventId, 'restaurant.membership');
    },
  });
};

