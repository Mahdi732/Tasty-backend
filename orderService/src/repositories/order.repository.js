export class OrderRepository {
  constructor(model) {
    this.model = model;
  }

  create(payload) {
    return this.model.create(payload);
  }

  findById(id) {
    return this.model.findById(id);
  }

  listByUser(userId) {
    return this.model.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  listOutstandingDebtByUser(userId) {
    return this.model.find({
      userId: String(userId),
      'debt.status': 'OUTSTANDING',
      'debt.amount': { $gt: 0 },
      'payment.status': { $ne: 'PAID' },
    }).sort({ createdAt: -1 }).lean();
  }

  async clearPaidOutstandingDebtByUser(userId) {
    const now = new Date();

    await this.model.updateMany(
      {
        userId: String(userId),
        'debt.status': 'OUTSTANDING',
        'debt.amount': { $gt: 0 },
        'payment.status': 'PAID',
      },
      {
        $set: {
          'debt.status': 'CLEARED',
          'debt.amount': 0,
          'debt.clearedAt': now,
          'riskFlags.qrExpiredBlacklistTriggered': false,
          'riskFlags.temporaryReview': false,
        },
      }
    );
  }

  listByRestaurant(restaurantId) {
    return this.model.find({ restaurantId: String(restaurantId) }).sort({ createdAt: -1 }).lean();
  }

  listAll() {
    return this.model.find({}).sort({ createdAt: -1 }).lean();
  }

  updateById(id, payload) {
    return this.model.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  }

  findExpiredUnscanned(now, limit = 200) {
    return this.model
      .find({
        'qr.expiresAt': { $lt: now },
        'qr.scannedAt': null,
        'payment.status': { $ne: 'PAID' },
        'debt.status': { $ne: 'CLEARED' },
        orderStatus: { $nin: ['EXPIRED', 'COMPLETED', 'CANCELLED'] },
      })
      .limit(limit)
      .lean();
  }
}

