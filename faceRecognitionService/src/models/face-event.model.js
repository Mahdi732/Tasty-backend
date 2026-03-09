import mongoose from 'mongoose';

const faceEventSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    personRef: { type: String, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: {} },
    latencyMs: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

export const FaceEventModel = mongoose.model('FaceEvent', faceEventSchema);
