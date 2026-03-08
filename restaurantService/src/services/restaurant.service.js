import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import {
  RESTAURANT_STATUS,
  RESTAURANT_VISIBILITY,
  SUBSCRIPTION_STATUS,
  VERIFICATION_STATUS,
} from '../constants/restaurant.js';
import { EVENTS } from '../constants/messaging.js';
import { toSlug } from '../utils/slug.js';

export class RestaurantService {
  constructor({
    restaurantRepository,
    restaurantUserRepository,
    activationGateService,
    projectionService,
    defaultCurrency,
    domainEventPublisher,
    eventHeadersFactory,
    logger,
  }) {
    this.restaurantRepository = restaurantRepository;
    this.restaurantUserRepository = restaurantUserRepository;
    this.activationGateService = activationGateService;
    this.projectionService = projectionService;
    this.defaultCurrency = defaultCurrency;
    this.domainEventPublisher = domainEventPublisher;
    this.eventHeadersFactory = eventHeadersFactory || (() => ({}));
    this.logger = logger;
  }

  async publishEvent(routingKey, payload) {
    if (!this.domainEventPublisher) return;
    try {
      await this.domainEventPublisher.publish(routingKey, payload, this.eventHeadersFactory());
    } catch (error) {
      this.logger?.error({ err: error, routingKey }, 'restaurant_event_publish_failed');
    }
  }

  isPubliclyVisible(restaurant) {
    return (
      restaurant.status === RESTAURANT_STATUS.ACTIVE
      && restaurant.subscription?.status === SUBSCRIPTION_STATUS.ACTIVE
      && restaurant.verification?.status === VERIFICATION_STATUS.VERIFIED
    );
  }

  toVisibility(restaurant) {
    return this.isPubliclyVisible(restaurant)
      ? RESTAURANT_VISIBILITY.PUBLIC
      : RESTAURANT_VISIBILITY.HIDDEN;
  }

  async createRestaurant(auth, payload) {
    const ownerRestaurantIds = await this.restaurantUserRepository.findRestaurantIdsByUserAndRoles(
      auth.userId,
      ['OWNER']
    );
    const hasDraftUnpaid = await this.restaurantRepository.existsDraftUnpaidByIds(ownerRestaurantIds);
    if (hasDraftUnpaid) {
      throw new ApiError(
        409,
        ERROR_CODES.CONFLICT,
        'Cannot create another restaurant while an existing draft is unpaid'
      );
    }

    const slug = toSlug(payload.slug || payload.name);
    const citySlug = toSlug(payload.location.citySlug || payload.location.city);
    const creationFlow = payload.creationFlow || 'DRAFT_FIRST';

    const initialSubscription = creationFlow === 'MEMBERSHIP_FIRST'
      ? {
        status: payload.subscription?.status || SUBSCRIPTION_STATUS.PENDING,
        subscriptionPlanId: payload.subscription?.subscriptionPlanId || null,
        providerCustomerId: payload.subscription?.providerCustomerId || null,
        providerSubscriptionId: payload.subscription?.providerSubscriptionId || null,
        currentPeriodEnd: payload.subscription?.currentPeriodEnd || null,
        cancelAtPeriodEnd: payload.subscription?.cancelAtPeriodEnd || false,
      }
      : {
        status: SUBSCRIPTION_STATUS.PENDING,
        subscriptionPlanId: null,
      };

    if (creationFlow === 'MEMBERSHIP_FIRST' && initialSubscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
      throw new ApiError(409, ERROR_CODES.CONFLICT, 'Membership-first creation requires ACTIVE subscription status');
    }

    let initialStatus = RESTAURANT_STATUS.DRAFT;
    let activationBlockers = [];
    let activatedAt = null;

    if (creationFlow === 'MEMBERSHIP_FIRST') {
      const gateResult = this.activationGateService.evaluate({
        subscription: initialSubscription,
        verification: { status: VERIFICATION_STATUS.UNVERIFIED },
      });
      initialStatus = gateResult.nextStatus;
      activationBlockers = gateResult.activationBlockers;
      activatedAt = gateResult.nextStatus === RESTAURANT_STATUS.ACTIVE ? new Date() : null;
    }

    const initialVisibility = initialStatus === RESTAURANT_STATUS.ACTIVE
      ? RESTAURANT_VISIBILITY.PUBLIC
      : RESTAURANT_VISIBILITY.HIDDEN;

    const restaurant = await this.restaurantRepository.create({
      ...payload,
      slug,
      location: {
        ...payload.location,
        citySlug,
      },
      settings: {
        currency: payload.settings?.currency || this.defaultCurrency,
        taxRate: payload.settings?.taxRate ?? 0,
        serviceFee: payload.settings?.serviceFee ?? 0,
        supportedOrderModes: payload.settings?.supportedOrderModes || ['pickup'],
      },
      status: initialStatus,
      visibility: initialVisibility,
      activationBlockers,
      activatedAt,
      subscription: initialSubscription,
      createdBy: auth.userId,
      updatedBy: auth.userId,
    });

    await this.restaurantUserRepository.create({
      restaurantId: restaurant._id,
      userId: auth.userId,
      role: 'OWNER',
    });

    await this.publishEvent(EVENTS.RESTAURANT_CREATED, {
      restaurantId: String(restaurant._id),
      createdBy: auth.userId,
      name: restaurant.name,
      slug: restaurant.slug,
    });

    await this.publishEvent(EVENTS.RESTAURANT_STAFF_ASSIGNED, {
      restaurantId: String(restaurant._id),
      userId: auth.userId,
      role: 'OWNER',
    });

    return restaurant;
  }

  async updateRestaurant(restaurantId, auth, payload) {
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');

    if (![RESTAURANT_STATUS.DRAFT, RESTAURANT_STATUS.PENDING_SUBSCRIPTION, RESTAURANT_STATUS.PENDING_VERIFICATION].includes(restaurant.status)) {
      throw new ApiError(409, ERROR_CODES.CONFLICT, 'Restaurant is not editable in current status');
    }

    const updatePayload = {
      ...payload,
      updatedBy: auth.userId,
    };

    if (payload.slug || payload.location?.citySlug || payload.location?.city) {
      updatePayload.slug = toSlug(payload.slug || restaurant.slug);
      updatePayload.location = {
        ...restaurant.location.toObject(),
        ...payload.location,
        citySlug: toSlug(payload.location?.citySlug || payload.location?.city || restaurant.location.citySlug),
      };
    }

    return this.restaurantRepository.updateById(restaurantId, updatePayload);
  }

  async requestPublish(restaurantId, auth) {
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');

    if ([RESTAURANT_STATUS.SUSPENDED, RESTAURANT_STATUS.CLOSED].includes(restaurant.status)) {
      throw new ApiError(409, ERROR_CODES.CONFLICT, 'Cannot request publish from current status');
    }

    const gateResult = this.activationGateService.evaluate(restaurant);
    const nextPayload = {
      status: gateResult.nextStatus,
      activationBlockers: gateResult.activationBlockers,
      visibility: gateResult.nextStatus === RESTAURANT_STATUS.ACTIVE
        ? RESTAURANT_VISIBILITY.PUBLIC
        : RESTAURANT_VISIBILITY.HIDDEN,
      publishRequestedAt: new Date(),
      updatedBy: auth.userId,
    };

    if (gateResult.nextStatus === RESTAURANT_STATUS.ACTIVE) {
      nextPayload.activatedAt = new Date();
      nextPayload.suspendedAt = null;
      nextPayload.suspendedReason = null;
    }

    const updated = await this.restaurantRepository.updateById(restaurantId, nextPayload);
    await this.projectionService.rebuildForRestaurant(restaurantId);

    return updated;
  }

  async getManagerRestaurant(restaurantId, auth) {
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');
    return restaurant;
  }

  async addStaffMember(restaurantId, auth, payload) {
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');

    try {
      const mapping = await this.restaurantUserRepository.create({
        restaurantId,
        userId: payload.userId,
        role: payload.role,
      });

      await this.publishEvent(EVENTS.RESTAURANT_STAFF_ASSIGNED, {
        restaurantId: String(restaurantId),
        userId: payload.userId,
        role: payload.role,
        assignedBy: auth.userId,
      });

      return mapping;
    } catch (error) {
      if (error?.code === 11000) {
        throw new ApiError(409, ERROR_CODES.CONFLICT, 'User already assigned to this restaurant');
      }
      throw error;
    }
  }

  async archiveRestaurant(restaurantId, auth) {
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');

    if (restaurant.status === RESTAURANT_STATUS.ARCHIVED) {
      throw new ApiError(409, ERROR_CODES.CONFLICT, 'Restaurant already archived');
    }

    const updated = await this.restaurantRepository.updateById(restaurantId, {
      status: RESTAURANT_STATUS.ARCHIVED,
      visibility: RESTAURANT_VISIBILITY.HIDDEN,
      archivedAt: new Date(),
      archivedBy: auth.userId,
      restoreFeeRequired: true,
      restoreFeePaidAt: null,
      updatedBy: auth.userId,
    });

    await this.publishEvent(EVENTS.RESTAURANT_ARCHIVED, {
      restaurantId: String(updated._id),
      archivedBy: auth.userId,
    });

    return updated;
  }

  async requestRestoreFee(restaurantId, auth, payload = {}) {
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');

    if (restaurant.status !== RESTAURANT_STATUS.ARCHIVED) {
      throw new ApiError(409, ERROR_CODES.CONFLICT, 'Restore fee can only be requested for archived restaurants');
    }

    await this.publishEvent(EVENTS.RESTORE_FEE_PAYMENT_REQUESTED, {
      restaurantId: String(restaurant._id),
      requestedBy: auth.userId,
      reason: payload.reason || null,
      feeType: 'RESTORE_FEE_PAYMENT',
    });

    return restaurant;
  }

  async triggerLowStockAlert(restaurantId, auth, payload) {
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');

    await this.publishEvent(EVENTS.INVENTORY_CHECK, {
      restaurantId: String(restaurant._id),
      requestedBy: auth.userId,
      trigger: 'CHEF_LOW_STOCK_ALERT',
      ...payload,
    });

    return {
      accepted: true,
      restaurantId: String(restaurant._id),
      trigger: 'CHEF_LOW_STOCK_ALERT',
    };
  }

  async verifyRestaurant(restaurantId, auth, reviewNotes) {
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');

    const updated = await this.restaurantRepository.updateById(restaurantId, {
      verification: {
        ...restaurant.verification.toObject(),
        status: VERIFICATION_STATUS.VERIFIED,
        verifiedAt: new Date(),
        verifiedBy: auth.userId,
        reviewNotes: reviewNotes || null,
      },
      visibility: this.toVisibility({
        ...restaurant.toObject(),
        verification: {
          ...restaurant.verification.toObject(),
          status: VERIFICATION_STATUS.VERIFIED,
        },
      }),
      updatedBy: auth.userId,
    });

    return updated;
  }

  async unverifyRestaurant(restaurantId, auth, reviewNotes) {
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');

    return this.restaurantRepository.updateById(restaurantId, {
      verification: {
        ...restaurant.verification.toObject(),
        status: VERIFICATION_STATUS.UNVERIFIED,
        verifiedAt: null,
        verifiedBy: null,
        reviewNotes: reviewNotes || null,
      },
      visibility: RESTAURANT_VISIBILITY.HIDDEN,
      updatedBy: auth.userId,
    });
  }

  async rejectVerification(restaurantId, auth, reviewNotes) {
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');

    return this.restaurantRepository.updateById(restaurantId, {
      verification: {
        ...restaurant.verification.toObject(),
        status: VERIFICATION_STATUS.REJECTED,
        verifiedAt: null,
        verifiedBy: auth.userId,
        reviewNotes: reviewNotes || null,
      },
      status: RESTAURANT_STATUS.PENDING_VERIFICATION,
      visibility: RESTAURANT_VISIBILITY.HIDDEN,
      activationBlockers: ['VERIFICATION_REJECTED'],
      updatedBy: auth.userId,
    });
  }

  async suspendRestaurant(restaurantId, auth, reason) {
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');

    const updated = await this.restaurantRepository.updateById(restaurantId, {
      status: RESTAURANT_STATUS.SUSPENDED,
      visibility: RESTAURANT_VISIBILITY.HIDDEN,
      suspendedAt: new Date(),
      suspendedReason: reason || 'Administrative action',
      updatedBy: auth.userId,
    });

    await this.projectionService.rebuildForRestaurant(restaurantId);
    return updated;
  }

  async unsuspendRestaurant(restaurantId, auth) {
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');

    const gateResult = this.activationGateService.evaluate(restaurant);
    const updated = await this.restaurantRepository.updateById(restaurantId, {
      status: gateResult.nextStatus,
      visibility: gateResult.nextStatus === RESTAURANT_STATUS.ACTIVE
        ? RESTAURANT_VISIBILITY.PUBLIC
        : RESTAURANT_VISIBILITY.HIDDEN,
      activationBlockers: gateResult.activationBlockers,
      suspendedAt: null,
      suspendedReason: null,
      activatedAt: gateResult.nextStatus === RESTAURANT_STATUS.ACTIVE ? new Date() : restaurant.activatedAt,
      updatedBy: auth.userId,
    });

    await this.projectionService.rebuildForRestaurant(restaurantId);
    return updated;
  }

  async updateSubscription(restaurantId, auth, subscriptionPayload) {
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');

    const updated = await this.restaurantRepository.updateById(restaurantId, {
      subscription: {
        ...restaurant.subscription.toObject(),
        ...subscriptionPayload,
      },
      visibility: this.toVisibility({
        ...restaurant.toObject(),
        subscription: {
          ...restaurant.subscription.toObject(),
          ...subscriptionPayload,
        },
      }),
      updatedBy: auth.userId,
    });

    return updated;
  }

  async listPublicRestaurants({ page, limit, citySlug, query }) {
    const [data, total] = await Promise.all([
      this.restaurantRepository.listPublic({ page, limit, citySlug, query }),
      this.restaurantRepository.countPublic({ citySlug, query }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getPublicRestaurantByCitySlug(citySlug, slug) {
    const restaurant = await this.restaurantRepository.findByCityAndSlug(citySlug, slug);
    if (
      !restaurant
      || restaurant.status !== RESTAURANT_STATUS.ACTIVE
      || restaurant.visibility !== RESTAURANT_VISIBILITY.PUBLIC
      || restaurant.subscription.status !== SUBSCRIPTION_STATUS.ACTIVE
      || restaurant.verification.status !== VERIFICATION_STATUS.VERIFIED
    ) {
      throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');
    }

    return restaurant;
  }
}
