import mongoose from 'mongoose';

const restaurantManagerSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    managerUserId: { type: String, required: true, index: true },
    role: { type: String, enum: ['OWNER', 'MANAGER'], default: 'OWNER' },
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false }
);

restaurantManagerSchema.index({ restaurantId: 1, managerUserId: 1 }, { unique: true });
restaurantManagerSchema.index({ managerUserId: 1, isActive: 1 });

export const RestaurantManagerModel = mongoose.model('RestaurantManager', restaurantManagerSchema);
