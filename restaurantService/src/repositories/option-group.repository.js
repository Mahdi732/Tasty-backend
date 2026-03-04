export class OptionGroupRepository {
  constructor(model) {
    this.model = model;
  }

  create(payload) {
    return this.model.create(payload);
  }

  findByIds(ids) {
    return this.model.find({ _id: { $in: ids }, deletedAt: null, isActive: true }).lean();
  }

  softDeleteByRestaurant(restaurantId) {
    return this.model.updateMany(
      { restaurantId, deletedAt: null },
      { $set: { deletedAt: new Date(), isActive: false } }
    );
  }
}
