import mongoose from 'mongoose';
import {
  ACTIVATION_BLOCKERS,
  RESTAURANT_STATUS,
  RESTAURANT_VISIBILITY,
  SUBSCRIPTION_STATUS,
  VERIFICATION_STATUS,
} from '../constants/restaurant.js';

const contactSchema = new mongoose.Schema(
  {
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    city: { type: String, required: true, trim: true },
    citySlug: { type: String, required: true, trim: true, lowercase: true },
    address: { type: String, trim: true },
    geo: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
  },
  { _id: false }
);

const openingHourSchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    open: { type: String, required: true },
    close: { type: String, required: true },
    isClosed: { type: Boolean, default: false },
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    currency: { type: String, required: true, default: 'USD' },
    taxRate: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0 },
    supportedOrderModes: { type: [String], default: ['pickup'] },
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.PENDING,
      index: true,
    },
    subscriptionPlanId: { type: String, default: null },
    providerCustomerId: { type: String, default: null },
    providerSubscriptionId: { type: String, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { _id: false }
);

const verificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.UNVERIFIED,
      index: true,
    },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: String, default: null },
    reviewNotes: { type: String, default: null },
  },
  { _id: false }
);

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    coverUrl: { type: String, default: '' },
    contact: { type: contactSchema, default: {} },
    location: { type: locationSchema, required: true },
    openingHours: { type: [openingHourSchema], default: [] },
    settings: { type: settingsSchema, default: {} },

    status: {
      type: String,
      enum: Object.values(RESTAURANT_STATUS),
      default: RESTAURANT_STATUS.DRAFT,
      index: true,
    },
    visibility: {
      type: String,
      enum: Object.values(RESTAURANT_VISIBILITY),
      default: RESTAURANT_VISIBILITY.HIDDEN,
      index: true,
    },
    activationBlockers: {
      type: [
        {
          type: String,
          enum: Object.values(ACTIVATION_BLOCKERS),
        },
      ],
      default: [],
    },

    subscription: { type: subscriptionSchema, default: {} },
    verification: { type: verificationSchema, default: {} },

    publishRequestedAt: { type: Date, default: null },
    activatedAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
    suspendedReason: { type: String, default: null },
    archivedAt: { type: Date, default: null },
    archivedBy: { type: String, default: null },
    restoreFeeRequired: { type: Boolean, default: false },
    restoreFeePaidAt: { type: Date, default: null },

    deletedAt: { type: Date, default: null, index: true },
    createdBy: { type: String, required: true, index: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

restaurantSchema.index({ 'location.citySlug': 1, slug: 1 }, { unique: true });
restaurantSchema.index({ status: 1, updatedAt: -1 });
restaurantSchema.index({ visibility: 1, status: 1, updatedAt: -1 });
restaurantSchema.index({ 'location.geo': '2dsphere' });
restaurantSchema.index({ name: 'text', description: 'text' });

export const RestaurantModel = mongoose.model('Restaurant', restaurantSchema);

