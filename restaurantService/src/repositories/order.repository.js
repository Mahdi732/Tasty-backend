export class OrderRepository {
  constructor(model) {
    this.model = model;
  }

  create(payload) {
    return this.model.create(payload);
  }

  listByUser(userId) {
    return this.model.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  listByRestaurant(restaurantId) {
    return this.model.find({ restaurantId: String(restaurantId) }).sort({ createdAt: -1 }).lean();
  }

  listAll() {
    return this.model.find({}).sort({ createdAt: -1 }).lean();
  }
}
