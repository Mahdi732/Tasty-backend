import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import { ROLES } from '../constants/roles.js';
import { RESTAURANT_STATUS, VERIFICATION_STATUS } from '../constants/restaurant.js';
import { toSlug } from '../utils/slug.js';

export class RestaurantService {
  constructor({
    restaurantRepository,
    restaurantUserRepository,
    activationGateService,
    projectionService,
    defaultCurrency,
  }) {
    this.restaurantRepository = restaurantRepository;
    this.restaurantUserRepository = restaurantUserRepository;
    this.activationGateService = activationGateService;
    this.projectionService = projectionService;
    this.defaultCurrency = defaultCurrency;
  }

  async ensureManageAccess(restaurantId, auth) {
    if (auth.roles.includes(ROLES.SUPERADMIN)) return;

    const owns = await this.restaurantUserRepository.hasRestaurantAccess(restaurantId, auth.userId);
    if (!owns) {
      throw new ApiError(403, ERROR_CODES.TENANT_ACCESS_DENIED, 'Access denied for this restaurant');
    }
  }

  async createRestaurant(auth, payload) {
    const slug = toSlug(payload.slug || payload.name);
    const citySlug = toSlug(payload.location.citySlug || payload.location.city);

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
      createdBy: auth.userId,
      updatedBy: auth.userId,
    });

    await this.restaurantUserRepository.create({
      restaurantId: restaurant._id,
      userId: auth.userId,
      role: 'OWNER',
    });

    return restaurant;
  }

  async updateRestaurant(restaurantId, auth, payload) {
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');

    await this.ensureManageAccess(restaurantId, auth);

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

    await this.ensureManageAccess(restaurantId, auth);

    if ([RESTAURANT_STATUS.SUSPENDED, RESTAURANT_STATUS.CLOSED].includes(restaurant.status)) {
      throw new ApiError(409, ERROR_CODES.CONFLICT, 'Cannot request publish from current status');
    }

    const gateResult = this.activationGateService.evaluate(restaurant);
    const nextPayload = {
      status: gateResult.nextStatus,
      activationBlockers: gateResult.activationBlockers,
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
    await this.ensureManageAccess(restaurantId, auth);
    return restaurant;
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
      activationBlockers: ['VERIFICATION_REJECTED'],
      updatedBy: auth.userId,
    });
  }

  async suspendRestaurant(restaurantId, auth, reason) {
    const restaurant = await this.restaurantRepository.findById(restaurantId);
    if (!restaurant) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');

    const updated = await this.restaurantRepository.updateById(restaurantId, {
      status: RESTAURANT_STATUS.SUSPENDED,
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
    if (!restaurant || restaurant.status !== RESTAURANT_STATUS.ACTIVE) {
      throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');
    }

    return restaurant;
  }
}
