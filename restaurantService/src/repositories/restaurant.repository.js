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

  findByIds(ids = []) {
    if (!ids.length) return Promise.resolve([]);
    return this.model.find({
      _id: { $in: ids.map(String) },
      deletedAt: null,
    }).sort({ updatedAt: -1 });
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

  existsUnresolvedUnpaidByIds(ids) {
    if (!ids?.length) return Promise.resolve(false);
    return this.model.exists({
      _id: { $in: ids },
      status: { $in: ['DRAFT', 'PENDING_SUBSCRIPTION', 'PENDING_VERIFICATION', 'ARCHIVED'] },
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

  async activateByRestaurantId(restaurantId, subscription = {}) {
    if (!restaurantId) return { matchedCount: 0, modifiedCount: 0 };

    const setPayload = {
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      activationBlockers: [],
      suspendedAt: null,
      suspendedReason: null,
      restoreFeeRequired: false,
      'subscription.status': 'ACTIVE',
      'verification.status': 'VERIFIED',
      'verification.reviewNotes': 'Auto-verified from successful subscription payment event',
    };

    if (subscription.subscriptionPlanId) {
      setPayload['subscription.subscriptionPlanId'] = subscription.subscriptionPlanId;
    }

    if (subscription.providerSubscriptionId) {
      setPayload['subscription.providerSubscriptionId'] = subscription.providerSubscriptionId;
    }

    const now = new Date();
    setPayload.activatedAt = now;
    setPayload.restoreFeePaidAt = now;
    setPayload['verification.verifiedAt'] = now;

    const result = await this.model.updateOne(
      {
        _id: String(restaurantId),
        status: { $ne: 'SUSPENDED' },
        deletedAt: null,
      },
      {
        $set: setPayload,
      }
    );

    return {
      matchedCount: result.matchedCount || 0,
      modifiedCount: result.modifiedCount || 0,
    };
  }
}

