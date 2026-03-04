import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    restaurantId: { type: String, required: true, index: true },
    items: { type: [orderItemSchema], default: [] },
    status: { type: String, default: 'pending' },
  },
  { timestamps: true, versionKey: false }
);

orderSchema.index({ restaurantId: 1, createdAt: -1 });
orderSchema.index({ userId: 1, createdAt: -1 });

export const OrderModel = mongoose.model('Order', orderSchema);