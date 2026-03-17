import mongoose from 'mongoose';
import { PAYMENT_STATUS, PAYMENT_TRANSACTION_TYPE } from '../constants/payment.js';

const paymentTransactionSchema = new mongoose.Schema(
  {
    transactionType: {
      type: String,
      enum: Object.values(PAYMENT_TRANSACTION_TYPE),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    userId: { type: String, required: true, index: true },
    restaurantId: { type: String, default: null, index: true },
    orderId: { type: String, default: null, index: true },
    planId: { type: String, default: null },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    provider: { type: String, default: 'SIMULATED' },
    providerRef: { type: String, default: null, index: true },
    paymentMethod: {
      type: {
        type: String,
        default: 'CARD',
      },
      maskedPan: { type: String, default: null },
      brand: { type: String, default: null },
      token: { type: String, default: null },
    },
    metadata: { type: Object, default: {} },
    processedAt: { type: Date, default: null },
    failedReason: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

paymentTransactionSchema.index({ createdAt: -1 });

export const PaymentTransactionModel = mongoose.model('PaymentTransaction', paymentTransactionSchema);
