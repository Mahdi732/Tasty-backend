import mongoose from 'mongoose';

const phoneVerificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    phoneNumber: { type: String, required: true, trim: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    expiresAt: { type: Date, required: true, index: true },
    lockedUntil: { type: Date, default: null },
    consumedAt: { type: Date, default: null, index: true },
    lastSentAt: { type: Date, default: Date.now },
    requestId: { type: String, default: null },
  },
  { timestamps: true }
);

phoneVerificationSchema.index({ userId: 1, phoneNumber: 1, consumedAt: 1 });

export const PhoneVerificationModel = mongoose.model('PhoneVerification', phoneVerificationSchema);
