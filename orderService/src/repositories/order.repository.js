export class OrderRepository {
  constructor(model) {
    this.model = model;
  }

  create(payload) {
    return this.model.create(payload);
  }

  findById(id) {
    return this.model.findById(id);
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

  updateById(id, payload) {
    return this.model.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  }
}
