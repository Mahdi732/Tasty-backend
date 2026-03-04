import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuCategory',
      required: true,
      index: true,
    },
    optionGroupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'OptionGroup' }],
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    images: { type: [String], default: [] },
    basePrice: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    availability: {
      type: String,
      enum: ['IN_STOCK', 'OUT_OF_STOCK'],
      default: 'IN_STOCK',
      index: true,
    },
    isPublished: { type: Boolean, default: false, index: true },
    sortOrder: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    trackInventory: { type: Boolean, default: false },
    recipeId: { type: String, default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false }
);

menuItemSchema.index({ restaurantId: 1, categoryId: 1, sortOrder: 1 });
menuItemSchema.index({ restaurantId: 1, isPublished: 1, availability: 1 });

export const MenuItemModel = mongoose.model('MenuItem', menuItemSchema);
