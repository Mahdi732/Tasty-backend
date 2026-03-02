export class RestaurantManagerRepository {
  constructor(model) {
    this.model = model;
  }

  create(payload) {
    return this.model.create(payload);
  }

  async isManagerOfRestaurant(restaurantId, managerUserId) {
    const mapping = await this.model.findOne({
      restaurantId,
      managerUserId,
      isActive: true,
      deletedAt: null,
    });
    return Boolean(mapping);
  }
}
