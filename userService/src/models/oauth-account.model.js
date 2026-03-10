import mongoose from 'mongoose';
import { OAUTH_PROVIDERS } from '../constants/auth.js';

const oauthAccountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: Object.values(OAUTH_PROVIDERS), required: true },
    providerUserId: { type: String, required: true },
    providerEmail: { type: String, default: null },
    emailVerifiedAt: { type: Date, default: null },
    profile: { type: Object, default: {} },
    linkedAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

oauthAccountSchema.index({ provider: 1, providerUserId: 1 }, { unique: true });
oauthAccountSchema.index({ userId: 1, provider: 1 }, { unique: true });
oauthAccountSchema.index({ providerEmail: 1 });

export const OAuthAccountModel = mongoose.model('OAuthAccount', oauthAccountSchema);

