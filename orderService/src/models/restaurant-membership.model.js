import mongoose from 'mongoose';

const restaurantMembershipSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    restaurantId: { type: String, required: true, index: true },
    role: { type: String, enum: ['OWNER', 'MANAGER', 'STAFF', 'DELIVERY_MAN', 'CHEF'], required: true },
  },
  { timestamps: true, versionKey: false }
);

restaurantMembershipSchema.index({ userId: 1, restaurantId: 1 }, { unique: true });

export const RestaurantMembershipModel = mongoose.model('RestaurantMembership', restaurantMembershipSchema);
