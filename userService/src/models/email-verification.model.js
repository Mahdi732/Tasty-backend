import mongoose from 'mongoose';

const emailVerificationSchema = new mongoose.Schema(
  {
    identifierHash: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    purpose: { type: String, enum: ['email_verification'], default: 'email_verification', index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    lastSentAt: { type: Date, default: Date.now },
    lockedUntil: { type: Date, default: null },
    consumedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
emailVerificationSchema.index({ identifierHash: 1, purpose: 1, consumedAt: 1 });

export const EmailVerificationModel = mongoose.model('EmailVerification', emailVerificationSchema);

