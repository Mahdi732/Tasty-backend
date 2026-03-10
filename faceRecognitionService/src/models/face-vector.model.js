import mongoose from 'mongoose';

const faceVectorSchema = new mongoose.Schema(
  {
    identityId: { type: String, required: true, index: true },
    personRef: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    listType: { type: String, required: true, index: true },
    embedding: { type: [Number], required: true },
    dim: { type: Number, required: true },
    modelVersion: { type: String, required: true },
    qualityScore: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false }
);

faceVectorSchema.index({ tenantId: 1, listType: 1, active: 1 });

export const FaceVectorModel = mongoose.model('FaceVector', faceVectorSchema);

