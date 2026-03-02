export class MenuCategoryRepository {
  constructor(model) {
    this.model = model;
  }

  create(payload) {
    return this.model.create(payload);
  }

  listByRestaurant(restaurantId) {
    return this.model
      .find({ restaurantId, deletedAt: null, isActive: true })
      .sort({ sortOrder: 1 })
      .lean();
  }

  findById(id) {
    return this.model.findOne({ _id: id, deletedAt: null });
  }

  updateById(id, payload) {
    return this.model.findOneAndUpdate({ _id: id, deletedAt: null }, payload, {
      new: true,
      runValidators: true,
    });
  }

  softDelete(id) {
    return this.updateById(id, { deletedAt: new Date(), isActive: false });
  }
}
