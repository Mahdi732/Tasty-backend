import mongoose from 'mongoose';

const menuCategorySchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false }
);

menuCategorySchema.index({ restaurantId: 1, sortOrder: 1 });
menuCategorySchema.index({ restaurantId: 1, name: 1 });

export const MenuCategoryModel = mongoose.model('MenuCategory', menuCategorySchema);
