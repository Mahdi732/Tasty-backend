export class RestaurantRepository {
  constructor(model) {
    this.model = model;
  }

  buildPublicFilter({ citySlug, query }) {
    const filter = {
      status: 'ACTIVE',
      deletedAt: null,
    };
    if (citySlug) filter['location.citySlug'] = citySlug;
    if (query) {
      filter.$or = [
        { name: new RegExp(query, 'i') },
        { description: new RegExp(query, 'i') },
      ];
    }
    return filter;
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
    const filter = this.buildPublicFilter({ citySlug, query });

    return this.model
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  countPublic({ citySlug, query }) {
    const filter = this.buildPublicFilter({ citySlug, query });
    return this.model.countDocuments(filter);
  }

  existsDraftUnpaidByIds(ids) {
    if (!ids?.length) return Promise.resolve(false);
    return this.model.exists({
      _id: { $in: ids },
      status: 'DRAFT',
      'subscription.status': { $ne: 'ACTIVE' },
      deletedAt: null,
    });
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

  async activateByOwnerIds(ownerIds = []) {
    if (!ownerIds.length) return { matchedCount: 0, modifiedCount: 0 };

    const now = new Date();
    const result = await this.model.updateMany(
      {
        createdBy: { $in: ownerIds.map(String) },
        status: { $ne: 'SUSPENDED' },
        deletedAt: null,
      },
      {
        $set: {
          status: 'ACTIVE',
          visibility: 'PUBLIC',
          activationBlockers: [],
          activatedAt: now,
          suspendedAt: null,
          suspendedReason: null,
          'subscription.status': 'ACTIVE',
          'verification.status': 'VERIFIED',
          'verification.verifiedAt': now,
          'verification.reviewNotes': 'Auto-verified from successful subscription payment event',
        },
      }
    );

    return {
      matchedCount: result.matchedCount || 0,
      modifiedCount: result.modifiedCount || 0,
    };
  }
}

