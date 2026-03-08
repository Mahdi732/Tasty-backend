import mongoose from 'mongoose';

const restaurantUserSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    restaurantId: { type: String, required: true, index: true },
    role: { type: String, enum: ['OWNER', 'MANAGER', 'STAFF', 'DELIVERY_MAN', 'CHEF'], default: 'MANAGER' },
  },
  { timestamps: true, versionKey: false }
);

restaurantUserSchema.index({ userId: 1, restaurantId: 1 }, { unique: true });

export const RestaurantUserModel = mongoose.model('RestaurantUser', restaurantUserSchema);