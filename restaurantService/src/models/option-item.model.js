import mongoose from 'mongoose';

const optionItemSchema = new mongoose.Schema(
  {
    optionGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OptionGroup',
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    priceDelta: { type: Number, required: true, default: 0 },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false }
);

optionItemSchema.index({ optionGroupId: 1, sortOrder: 1 });

export const OptionItemModel = mongoose.model('OptionItem', optionItemSchema);

