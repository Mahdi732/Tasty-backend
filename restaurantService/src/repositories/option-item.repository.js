export class OptionItemRepository {
  constructor(model) {
    this.model = model;
  }

  createMany(payload) {
    return this.model.insertMany(payload);
  }

  listByGroupIds(optionGroupIds) {
    return this.model
      .find({ optionGroupId: { $in: optionGroupIds }, deletedAt: null, isActive: true })
      .sort({ sortOrder: 1 })
      .lean();
  }
}

