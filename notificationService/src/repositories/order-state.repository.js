export class OrderStateRepository {
  constructor(model) {
    this.model = model;
  }

  async upsertFromDriverArrived({ orderId, userId, restaurantId }) {
    return this.model.findOneAndUpdate(
      { orderId },
      {
        $set: {
          userId: userId || null,
          restaurantId: restaurantId || null,
          qrScanned: false,
          status: 'DRIVER_ARRIVED',
          updatedAtEvent: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async markScanned(orderId) {
    return this.model.findOneAndUpdate(
      { orderId },
      {
        $set: {
          qrScanned: true,
          status: 'QR_SCANNED',
          updatedAtEvent: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async markExpired(orderId) {
    return this.model.findOneAndUpdate(
      { orderId },
      {
        $set: {
          status: 'QR_EXPIRED',
          updatedAtEvent: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  findByOrderId(orderId) {
    return this.model.findOne({ orderId });
  }
}
