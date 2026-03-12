export class PhoneVerificationRepository {
  constructor(model) {
    this.model = model;
  }

  async upsertActiveCode(payload) {
    return this.model.findOneAndUpdate(
      {
        userId: payload.userId,
        phoneNumber: payload.phoneNumber,
        consumedAt: null,
      },
      {
        $set: {
          codeHash: payload.codeHash,
          expiresAt: payload.expiresAt,
          attempts: 0,
          maxAttempts: payload.maxAttempts,
          lastSentAt: payload.lastSentAt,
          lockedUntil: null,
          consumedAt: null,
          requestId: payload.requestId || null,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  async findActiveByUserAndPhone(userId, phoneNumber) {
    return this.model.findOne({
      userId,
      phoneNumber,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    });
  }

  async incrementAttemptsAndMaybeLock(id, maxAttempts, lockMs) {
    const doc = await this.model.findById(id);
    if (!doc) return null;

    doc.attempts += 1;
    if (doc.attempts >= maxAttempts) {
      doc.lockedUntil = new Date(Date.now() + lockMs);
    }

    await doc.save();
    return doc;
  }

  async markConsumed(id) {
    return this.model.findByIdAndUpdate(id, { consumedAt: new Date() }, { new: true });
  }
}
