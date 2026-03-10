export class SessionRepository {
  constructor(refreshSessionModel) {
    this.refreshSessionModel = refreshSessionModel;
  }

  async create(payload) {
    return this.refreshSessionModel.create(payload);
  }

  async findBySessionId(sessionId) {
    return this.refreshSessionModel.findOne({ sessionId });
  }

  async findActiveByUserId(userId) {
    return this.refreshSessionModel
      .find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } })
      .sort({ lastUsedAt: -1 });
  }

  async revokeSession(sessionId, reason = 'logout') {
    return this.refreshSessionModel.findOneAndUpdate(
      { sessionId, revokedAt: null },
      { $set: { revokedAt: new Date(), revokeReason: reason } },
      { new: true }
    );
  }

  async revokeFamily(familyId, reason = 'token_reuse') {
    return this.refreshSessionModel.updateMany(
      { familyId, revokedAt: null },
      { $set: { revokedAt: new Date(), revokeReason: reason, compromisedAt: new Date() } }
    );
  }

  async revokeAllForUser(userId, reason = 'logout_all', exceptSessionId = null) {
    const filter = { userId, revokedAt: null };
    if (exceptSessionId) {
      filter.sessionId = { $ne: exceptSessionId };
    }

    const result = await this.refreshSessionModel.updateMany(filter, {
      $set: { revokedAt: new Date(), revokeReason: reason },
    });

    return result.modifiedCount || 0;
  }

  async save(session) {
    return session.save();
  }
}

