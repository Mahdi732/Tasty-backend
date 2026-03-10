export class RestaurantMembershipRepository {
  constructor(model) {
    this.model = model;
  }

  async hasRestaurantAccess(restaurantId, userId) {
    const mapping = await this.model.findOne({ restaurantId: String(restaurantId), userId });
    return Boolean(mapping);
  }

  async upsertMapping(payload) {
    return this.model.findOneAndUpdate(
      { userId: payload.userId, restaurantId: String(payload.restaurantId) },
      { $set: { role: payload.role } },
      { upsert: true, new: true }
    );
  }

  async deleteMapping(payload) {
    return this.model.findOneAndDelete({ userId: payload.userId, restaurantId: String(payload.restaurantId) });
  }
}

