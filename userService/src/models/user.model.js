import mongoose from 'mongoose';
import { ROLE_LIST, ROLES } from '../constants/roles.js';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    passwordHash: { type: String, default: null },
    roles: { type: [String], enum: ROLE_LIST, default: [ROLES.USER] },
    tenantId: { type: String, default: null, index: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending_email_verification', 'active', 'disabled', 'locked'],
      default: 'pending_email_verification',
      index: true,
    },
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ tenantId: 1, roles: 1 });

export const UserModel = mongoose.model('User', userSchema);
