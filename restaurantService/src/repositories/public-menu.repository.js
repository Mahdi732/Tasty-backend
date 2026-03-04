export class PublicMenuRepository {
  constructor(model) {
    this.model = model;
  }

  upsertByRestaurant(restaurantId, payload) {
    return this.model.findOneAndUpdate(
      { restaurantId, deletedAt: null },
      { ...payload, generatedAt: new Date(), deletedAt: null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  findByCityAndSlug(citySlug, slug) {
    return this.model.findOne({ citySlug, slug, deletedAt: null }).lean();
  }

  softDeleteByRestaurant(restaurantId) {
    return this.model.findOneAndUpdate(
      { restaurantId, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
  }
}
