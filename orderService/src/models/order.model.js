import mongoose from 'mongoose';
import { DEBT_STATUS, ORDER_STATUS, ORDER_TYPE, PAYMENT_METHOD, PAYMENT_STATUS } from '../constants/order.js';

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: String, required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const restaurantSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, default: null },
    citySlug: { type: String, default: null },
    version: { type: Number, default: 1 },
  },
  { _id: false }
);

const fulfillmentSchema = new mongoose.Schema(
  {
    mode: { type: String, enum: Object.values(ORDER_TYPE), required: true },
    deliveryAddress: { type: String, default: null },
    tableRef: { type: String, default: null },
    scheduledAt: { type: Date, default: null },
    driverArrivedAt: { type: Date, default: null },
  },
  { _id: false }
);

const qrSchema = new mongoose.Schema(
  {
    token: { type: String, default: null },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    scannedAt: { type: Date, default: null },
    scannedBy: { type: String, default: null },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: Object.values(PAYMENT_METHOD), required: true },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.UNPAID, index: true },
    resourceType: { type: String, default: 'ORDER' },
    providerRef: { type: String, default: null },
    lastPaymentEventId: { type: String, default: null },
  },
  { _id: false }
);

const debtSchema = new mongoose.Schema(
  {
    status: { type: String, enum: Object.values(DEBT_STATUS), default: DEBT_STATUS.NONE, index: true },
    amount: { type: Number, default: 0 },
    recordedAt: { type: Date, default: null },
    clearedAt: { type: Date, default: null },
  },
  { _id: false }
);

const riskFlagsSchema = new mongoose.Schema(
  {
    qrExpiredBlacklistTriggered: { type: Boolean, default: false, index: true },
    temporaryReview: { type: Boolean, default: false },
  },
  { _id: false }
);

const immutableSnapshotSchema = new mongoose.Schema(
  {
    restaurant: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      slug: { type: String, default: null },
      citySlug: { type: String, default: null },
      version: { type: Number, default: 1 },
      taxRateAtOrder: { type: Number, default: 0 },
      serviceFeeAtOrder: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
    },
    items: { type: [orderItemSchema], default: [] },
    totals: {
      subtotal: { type: Number, required: true },
      tax: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },
    capturedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    restaurantId: { type: String, required: true, index: true },
    orderType: { type: String, enum: Object.values(ORDER_TYPE), required: true, index: true },
    orderStatus: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.CREATED, index: true },
    items: { type: [orderItemSchema], default: [] },
    restaurantSnapshot: { type: restaurantSnapshotSchema, required: true },
    immutableSnapshot: { type: immutableSnapshotSchema, required: true },
    fulfillment: { type: fulfillmentSchema, required: true },
    payment: { type: paymentSchema, default: {} },
    debt: { type: debtSchema, default: {} },
    riskFlags: { type: riskFlagsSchema, default: {} },
    totals: {
      subtotal: { type: Number, required: true },
      tax: { type: Number, default: 0 },
      serviceFee: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },
    qr: { type: qrSchema, required: true },
  },
  { timestamps: true, versionKey: false }
);

orderSchema.index({ restaurantId: 1, createdAt: -1 });
orderSchema.index({ userId: 1, createdAt: -1 });

export const OrderModel = mongoose.model('Order', orderSchema);

