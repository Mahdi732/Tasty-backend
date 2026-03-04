import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import { ROLES } from '../constants/roles.js';

export class OrderService {
  constructor({ orderRepository, restaurantRepository, restaurantUserRepository }) {
    this.orderRepository = orderRepository;
    this.restaurantRepository = restaurantRepository;
    this.restaurantUserRepository = restaurantUserRepository;
  }

  async placeOrder(auth, payload) {
    const restaurant = await this.restaurantRepository.findById(payload.restaurantId);
    if (!restaurant) {
      throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Restaurant not found');
    }

    return this.orderRepository.create({
      userId: auth.userId,
      restaurantId: String(payload.restaurantId),
      items: payload.items,
      status: payload.status || 'pending',
    });
  }

  listMyOrders(auth) {
    return this.orderRepository.listByUser(auth.userId);
  }

  async listRestaurantOrders(restaurantId, auth) {
    if (!auth.roles.includes(ROLES.SUPERADMIN)) {
      const hasAccess = await this.restaurantUserRepository.hasRestaurantAccess(restaurantId, auth.userId);
      if (!hasAccess) {
        throw new ApiError(403, ERROR_CODES.TENANT_ACCESS_DENIED, 'Access denied for this restaurant');
      }
    }

    return this.orderRepository.listByRestaurant(restaurantId);
  }

  listAllOrders() {
    return this.orderRepository.listAll();
  }
}
