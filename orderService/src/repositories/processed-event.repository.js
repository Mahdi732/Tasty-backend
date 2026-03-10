export class ProcessedEventRepository {
  constructor(model) {
    this.model = model;
  }

  async isProcessed(eventId) {
    if (!eventId) return false;
    const exists = await this.model.findOne({ eventId });
    return Boolean(exists);
  }

  async markProcessed(eventId, source) {
    if (!eventId) return null;
    return this.model.updateOne(
      { eventId },
      { $setOnInsert: { eventId, source, processedAt: new Date() } },
      { upsert: true }
    );
  }
}

