import mongoose from 'mongoose';

const refreshSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    refreshTokenHash: { type: String, required: true },
    previousRefreshTokenHash: { type: String, default: null },
    tokenVersion: { type: Number, default: 1 },
    userAgent: { type: String, default: 'unknown' },
    deviceId: { type: String, default: null },
    ipAddress: { type: String, default: null },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null, index: true },
    revokeReason: { type: String, default: null },
    revokedBy: { type: String, default: null },
    compromisedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

refreshSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshSessionModel = mongoose.model('RefreshSession', refreshSessionSchema);

