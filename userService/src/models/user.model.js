import mongoose from 'mongoose';
import { ROLE_LIST, ROLES } from '../constants/roles.js';
import { USER_STATUS_LIST, USER_STATUS } from '../constants/user-status.js';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    passwordHash: { type: String, default: null },
    roles: { type: [String], enum: ROLE_LIST, default: [ROLES.USER] },
    isEmailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: USER_STATUS_LIST,
      default: USER_STATUS.PENDING_EMAIL_VERIFICATION,
      index: true,
    },
    isFaceVerified: { type: Boolean, default: false },
    faceIdentityId: { type: String, default: null },
    activationDeadline: { type: Date, default: null, index: true },
    settings: {
      enableFaceLogin: { type: Boolean, default: false },
      enableOrderFaceConfirm: { type: Boolean, default: false },
    },
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model('User', userSchema);
