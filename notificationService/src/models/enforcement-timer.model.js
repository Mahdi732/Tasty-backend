import mongoose from 'mongoose';

const enforcementTimerSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    restaurantId: { type: String, default: null },
    state: {
      type: String,
      enum: ['ACTIVE', 'WARNING_SENT', 'CANCELLED', 'EXPIRED'],
      default: 'ACTIVE',
      index: true,
    },
    warningSentAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    startedAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false }
);

export const EnforcementTimerModel = mongoose.model('EnforcementTimer', enforcementTimerSchema);
