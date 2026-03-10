import mongoose from 'mongoose';
import { LIST_TYPE } from '../constants/face.js';

const faceIdentitySchema = new mongoose.Schema(
  {
    personRef: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    listType: {
      type: String,
      enum: Object.values(LIST_TYPE),
      default: LIST_TYPE.NORMAL,
      index: true,
    },
    reason: { type: String, default: null },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: String, default: 'system' },
  },
  { timestamps: true, versionKey: false }
);

faceIdentitySchema.index({ tenantId: 1, personRef: 1 }, { unique: true });

export const FaceIdentityModel = mongoose.model('FaceIdentity', faceIdentitySchema);

