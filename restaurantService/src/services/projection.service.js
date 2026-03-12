export class ProjectionService {
  constructor({
    restaurantRepository,
    categoryRepository,
    itemRepository,
    optionGroupRepository,
    optionItemRepository,
    publicMenuRepository,
    redisClient,
    cacheTtlSeconds,
  }) {
    this.restaurantRepository = restaurantRepository;
    this.categoryRepository = categoryRepository;
    this.itemRepository = itemRepository;
    this.optionGroupRepository = optionGroupRepository;
    this.optionItemRepository = optionItemRepository;
    this.publicMenuRepository = publicMenuRepository;
    this.redisClient = redisClient;
    this.cacheTtlSeconds = cacheTtlSeconds;
  }

  async rebuildForRestaurant(restaurantId) {
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant || restaurant.status !== 'ACTIVE' || restaurant.deletedAt) {
      await this.publicMenuRepository.softDeleteByRestaurant(restaurantId);
      if (restaurant) {
        await this.invalidateCache(restaurant.location.citySlug, restaurant.slug);
      }
      return null;
    }

    const categories = await this.categoryRepository.listByRestaurant(restaurantId);
    const items = await this.itemRepository.listPublishedByRestaurant(restaurantId, true);

    const groupIds = [...new Set(items.flatMap((item) => (item.optionGroupIds || []).map(String)))];
    const optionGroups = groupIds.length
      ? await this.optionGroupRepository.findByIds(groupIds)
      : [];
    const optionItems = groupIds.length
      ? await this.optionItemRepository.listByGroupIds(groupIds)
      : [];

    const itemByCategory = new Map();
    for (const item of items) {
      const key = String(item.categoryId);
      if (!itemByCategory.has(key)) itemByCategory.set(key, []);

      const linkedGroups = optionGroups
        .filter((group) => (item.optionGroupIds || []).map(String).includes(String(group._id)))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((group) => ({
          id: group._id,
          name: group.name,
          required: group.required,
          multiSelect: group.multiSelect,
          minSelect: group.minSelect,
          maxSelect: group.maxSelect,
          sortOrder: group.sortOrder,
          items: optionItems
            .filter((optionItem) => String(optionItem.optionGroupId) === String(group._id))
            .map((optionItem) => ({
              id: optionItem._id,
              name: optionItem.name,
              priceDelta: optionItem.priceDelta,
              sortOrder: optionItem.sortOrder,
            })),
        }));

      itemByCategory.get(key).push({
        id: item._id,
        name: item.name,
        description: item.description,
        images: item.images,
        basePrice: item.basePrice,
        averagePrepTime: item.averagePrepTime || 15,
        currency: item.currency,
        availability: item.availability,
        tags: item.tags,
        allergens: item.allergens,
        optionGroups: linkedGroups,
      });
    }

    const categoryProjection = categories.map((category) => ({
      id: category._id,
      name: category.name,
      description: category.description,
      sortOrder: category.sortOrder,
      items: itemByCategory.get(String(category._id)) || [],
    }));

    const projection = {
      citySlug: restaurant.location.citySlug,
      slug: restaurant.slug,
      restaurant: {
        name: restaurant.name,
        logoUrl: restaurant.logoUrl,
        coverUrl: restaurant.coverUrl,
        city: restaurant.location.city,
        citySlug: restaurant.location.citySlug,
      },
      categories: categoryProjection,
    };

    const saved = await this.publicMenuRepository.upsertByRestaurant(restaurantId, projection);
    await this.setCache(restaurant.location.citySlug, restaurant.slug, saved.toObject());
    return saved;
  }

  async getPublicMenu(citySlug, slug) {
    const cacheKey = this.cacheKey(citySlug, slug);
    if (this.redisClient) {
      const cached = await this.redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    const projection = await this.publicMenuRepository.findByCityAndSlug(citySlug, slug);
    if (projection && this.redisClient) {
      await this.setCache(citySlug, slug, projection);
    }
    return projection;
  }

  cacheKey(citySlug, slug) {
    return `public_menu:${citySlug}:${slug}`;
  }

  async setCache(citySlug, slug, payload) {
    if (!this.redisClient) return;
    await this.redisClient.set(this.cacheKey(citySlug, slug), JSON.stringify(payload), {
      EX: this.cacheTtlSeconds,
    });
  }

  async invalidateCache(citySlug, slug) {
    if (!this.redisClient) return;
    await this.redisClient.del(this.cacheKey(citySlug, slug));
  }
}

