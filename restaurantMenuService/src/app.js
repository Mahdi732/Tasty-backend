import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env, httpLogger, logger } from './config/index.js';
import { requestIdMiddleware } from './middlewares/request-id.middleware.js';
import { requestTimeoutMiddleware } from './middlewares/timeout.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { authMiddleware as authMiddlewareFactory } from './middlewares/auth.middleware.js';
import { requireRestaurantAccess } from './middlewares/restaurant-access.middleware.js';
import { JwtVerifier } from './security/jwt.verifier.js';

import { RestaurantModel } from './models/restaurant.model.js';
import { RestaurantUserModel } from './models/restaurant-user.model.js';
import { OrderModel } from './models/order.model.js';
import { MenuCategoryModel } from './models/menu-category.model.js';
import { MenuItemModel } from './models/menu-item.model.js';
import { OptionGroupModel } from './models/option-group.model.js';
import { OptionItemModel } from './models/option-item.model.js';
import { PublicMenuProjectionModel } from './models/public-menu-projection.model.js';

import { RestaurantRepository } from './repositories/restaurant.repository.js';
import { RestaurantUserRepository } from './repositories/restaurant-user.repository.js';
import { OrderRepository } from './repositories/order.repository.js';
import { MenuCategoryRepository } from './repositories/menu-category.repository.js';
import { MenuItemRepository } from './repositories/menu-item.repository.js';
import { OptionGroupRepository } from './repositories/option-group.repository.js';
import { OptionItemRepository } from './repositories/option-item.repository.js';
import { PublicMenuRepository } from './repositories/public-menu.repository.js';

import { ActivationGateService } from './services/activation-gate.service.js';
import { ProjectionService } from './services/projection.service.js';
import { RestaurantService } from './services/restaurant.service.js';
import { MenuService } from './services/menu.service.js';
import { OrderService } from './services/order.service.js';
import { PublicService } from './services/public.service.js';

import { HealthController } from './controllers/health.controller.js';
import { RestaurantController } from './controllers/restaurant.controller.js';
import { MenuController } from './controllers/menu.controller.js';
import { OrderController } from './controllers/order.controller.js';
import { PublicController } from './controllers/public.controller.js';
import { AdminController } from './controllers/admin.controller.js';
import { buildRoutes } from './routes/index.js';

export const buildApp = async ({ redisClient, authMiddlewareOverride } = {}) => {
  const app = express();

  const restaurantRepository = new RestaurantRepository(RestaurantModel);
  const restaurantUserRepository = new RestaurantUserRepository(RestaurantUserModel);
  const orderRepository = new OrderRepository(OrderModel);
  const categoryRepository = new MenuCategoryRepository(MenuCategoryModel);
  const itemRepository = new MenuItemRepository(MenuItemModel);
  const optionGroupRepository = new OptionGroupRepository(OptionGroupModel);
  const optionItemRepository = new OptionItemRepository(OptionItemModel);
  const publicMenuRepository = new PublicMenuRepository(PublicMenuProjectionModel);

  const activationGateService = new ActivationGateService({
    requireVerification: env.REQUIRE_VERIFICATION_FOR_ACTIVATION,
  });

  const projectionService = new ProjectionService({
    restaurantRepository,
    categoryRepository,
    itemRepository,
    optionGroupRepository,
    optionItemRepository,
    publicMenuRepository,
    redisClient,
    cacheTtlSeconds: env.PUBLIC_MENU_CACHE_TTL_SECONDS,
  });

  const restaurantService = new RestaurantService({
    restaurantRepository,
    restaurantUserRepository,
    activationGateService,
    projectionService,
    defaultCurrency: env.DEFAULT_RESTAURANT_CURRENCY,
  });

  const menuService = new MenuService({
    restaurantRepository,
    restaurantUserRepository,
    categoryRepository,
    itemRepository,
    optionGroupRepository,
    optionItemRepository,
    projectionService,
  });

  const orderService = new OrderService({
    orderRepository,
    restaurantRepository,
    restaurantUserRepository,
  });

  const publicService = new PublicService({
    restaurantService,
    projectionService,
  });

  const healthController = new HealthController({
    redisClient,
    redisEnabled: env.REDIS_ENABLED,
  });
  const restaurantController = new RestaurantController(restaurantService);
  const menuController = new MenuController(menuService);
  const orderController = new OrderController(orderService);
  const publicController = new PublicController(publicService);
  const adminController = new AdminController(restaurantService);

  const jwtVerifier = new JwtVerifier({
    jwksUri: env.JWT_JWKS_URI,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });
  const authMiddleware = authMiddlewareOverride || authMiddlewareFactory(jwtVerifier);
  const requireRestaurantManageAccess = requireRestaurantAccess({
    restaurantUserRepository,
    restaurantIdExtractor: (req) => req.params.id,
  });
  const requireRestaurantOrderAccess = requireRestaurantAccess({
    restaurantUserRepository,
    restaurantIdExtractor: (req) => req.params.restaurantId,
  });

  app.set('trust proxy', env.TRUST_PROXY);
  app.use(requestIdMiddleware);
  app.use(httpLogger);
  app.use(requestTimeoutMiddleware(env.REQUEST_TIMEOUT_MS));
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS_LIST }));
  app.use(express.json({ limit: env.BODY_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: env.BODY_LIMIT }));

  app.use(
    buildRoutes({
      healthController,
      publicController,
      restaurantController,
      menuController,
      orderController,
      adminController,
      authMiddleware,
      requireRestaurantManageAccess,
      requireRestaurantOrderAccess,
    })
  );

  app.use(notFoundMiddleware);
  app.use(errorMiddleware(logger));

  return app;
};
