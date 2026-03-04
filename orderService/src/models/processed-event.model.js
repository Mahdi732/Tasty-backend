import mongoose from 'mongoose';

const processedEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    source: { type: String, required: true },
    processedAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

export const ProcessedEventModel = mongoose.model('ProcessedEvent', processedEventSchema);
