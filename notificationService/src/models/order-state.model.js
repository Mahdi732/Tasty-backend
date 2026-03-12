import mongoose from 'mongoose';

const orderStateSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: null },
    restaurantId: { type: String, default: null },
    qrScanned: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ['DRIVER_ARRIVED', 'QR_SCANNED', 'QR_EXPIRED'],
      default: 'DRIVER_ARRIVED',
      index: true,
    },
    updatedAtEvent: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false }
);

export const OrderStateModel = mongoose.model('OrderState', orderStateSchema);
