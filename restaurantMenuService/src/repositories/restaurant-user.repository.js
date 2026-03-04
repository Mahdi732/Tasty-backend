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

  async findRestaurantIdsByUserAndRoles(userId, roles) {
    const mappings = await this.model.find({
      userId,
      role: { $in: roles },
    }).select({ restaurantId: 1 }).lean();
    return mappings.map((mapping) => mapping.restaurantId);
  }
}