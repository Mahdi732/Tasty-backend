export class RestaurantUserRepository {
  constructor(model) {
    this.model = model;
  }

  create(payload) {
    return this.model.create({
      ...payload,
      restaurantId: String(payload.restaurantId),
    });
  }

  async hasRestaurantAccess(restaurantId, userId) {
    const mapping = await this.model.findOne({
      restaurantId: String(restaurantId),
      userId,
    });
    return Boolean(mapping);
  }
}