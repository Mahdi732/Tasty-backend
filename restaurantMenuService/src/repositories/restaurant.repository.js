export class RestaurantRepository {
  constructor(model) {
    this.model = model;
  }

  create(payload) {
    return this.model.create(payload);
  }

  findById(id) {
    return this.model.findOne({ _id: id, deletedAt: null });
  }

  findByCityAndSlug(citySlug, slug) {
    return this.model.findOne({
      'location.citySlug': citySlug,
      slug,
      deletedAt: null,
    });
  }

  listPublic({ page, limit, citySlug, query }) {
    const filter = { status: 'ACTIVE', deletedAt: null };
    if (citySlug) filter['location.citySlug'] = citySlug;
    if (query) {
      filter.$or = [
        { name: new RegExp(query, 'i') },
        { description: new RegExp(query, 'i') },
      ];
    }

    return this.model
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  countPublic({ citySlug, query }) {
    const filter = { status: 'ACTIVE', deletedAt: null };
    if (citySlug) filter['location.citySlug'] = citySlug;
    if (query) {
      filter.$or = [
        { name: new RegExp(query, 'i') },
        { description: new RegExp(query, 'i') },
      ];
    }
    return this.model.countDocuments(filter);
  }

  updateById(id, payload) {
    return this.model.findOneAndUpdate({ _id: id, deletedAt: null }, payload, {
      new: true,
      runValidators: true,
    });
  }

  softDelete(id) {
    return this.updateById(id, { deletedAt: new Date() });
  }
}
