import mongoose from 'mongoose';

const publicMenuProjectionSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      unique: true,
      index: true,
    },
    citySlug: { type: String, required: true, index: true },
    slug: { type: String, required: true, index: true },
    restaurant: {
      name: String,
      logoUrl: String,
      coverUrl: String,
      city: String,
      citySlug: String,
    },
    categories: { type: Array, default: [] },
    generatedAt: { type: Date, default: Date.now, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false }
);

publicMenuProjectionSchema.index({ citySlug: 1, slug: 1 });

export const PublicMenuProjectionModel = mongoose.model(
  'PublicMenuProjection',
  publicMenuProjectionSchema
);
