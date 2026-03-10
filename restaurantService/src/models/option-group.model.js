import mongoose from 'mongoose';

const optionGroupSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    required: { type: Boolean, default: false },
    multiSelect: { type: Boolean, default: false },
    minSelect: { type: Number, default: 0 },
    maxSelect: { type: Number, default: 1 },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false }
);

optionGroupSchema.index({ restaurantId: 1, sortOrder: 1 });

export const OptionGroupModel = mongoose.model('OptionGroup', optionGroupSchema);

