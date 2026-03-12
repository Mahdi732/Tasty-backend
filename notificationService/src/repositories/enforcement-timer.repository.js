export class EnforcementTimerRepository {
  constructor(model) {
    this.model = model;
  }

  async upsertActive({ orderId, userId, restaurantId, startedAt }) {
    return this.model.findOneAndUpdate(
      { orderId },
      {
        $set: {
          userId,
          restaurantId,
          state: 'ACTIVE',
          startedAt,
          warningSentAt: null,
          expiredAt: null,
          cancelledAt: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  findByOrderId(orderId) {
    return this.model.findOne({ orderId });
  }

  markWarningSent(orderId, at) {
    return this.model.findOneAndUpdate({ orderId }, { state: 'WARNING_SENT', warningSentAt: at }, { new: true });
  }

  markExpired(orderId, at) {
    return this.model.findOneAndUpdate({ orderId }, { state: 'EXPIRED', expiredAt: at }, { new: true });
  }

  markCancelled(orderId, at) {
    return this.model.findOneAndUpdate({ orderId }, { state: 'CANCELLED', cancelledAt: at }, { new: true });
  }
}
