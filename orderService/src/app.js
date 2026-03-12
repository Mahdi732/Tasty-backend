import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env, httpLogger, logger } from './config/index.js';
import { requestIdMiddleware } from './middlewares/request-id.middleware.js';
import { requestTimeoutMiddleware } from './middlewares/timeout.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { authMiddleware as authMiddlewareFactory } from './middlewares/auth.middleware.js';
import { requireRole } from './middlewares/role.middleware.js';
import { requireRestaurantAccess } from './middlewares/restaurant-access.middleware.js';
import { JwtVerifier } from './security/jwt.verifier.js';

import { RabbitBus } from './messaging/rabbit.js';

import { OrderModel } from './models/order.model.js';
import { RestaurantMembershipModel } from './models/restaurant-membership.model.js';
import { ProcessedEventModel } from './models/processed-event.model.js';

import { OrderRepository } from './repositories/order.repository.js';
import { RestaurantMembershipRepository } from './repositories/restaurant-membership.repository.js';
import { ProcessedEventRepository } from './repositories/processed-event.repository.js';

import { QrService } from './services/qr.service.js';
import { FaceBlacklistClient } from './services/face-blacklist.client.js';
import { PaymentSkeletonService } from './services/payment-skeleton.service.js';
import { OrderService } from './services/order.service.js';

import { HealthController } from './controllers/health.controller.js';
import { OrderController } from './controllers/order.controller.js';
import { buildRoutes } from './routes/index.js';

export const createContainer = async () => {
  const rabbitBus = new RabbitBus({
    url: env.RABBITMQ_URL,
    eventsExchange: env.RABBITMQ_EXCHANGE_EVENTS,
    commandsExchange: env.RABBITMQ_EXCHANGE_COMMANDS,
    prefetch: env.RABBITMQ_PREFETCH,
    logger,
  });
  await rabbitBus.connect();

  const orderRepository = new OrderRepository(OrderModel);
  const membershipRepository = new RestaurantMembershipRepository(RestaurantMembershipModel);
  const processedEventRepository = new ProcessedEventRepository(ProcessedEventModel);

  const qrService = new QrService({
    signingSecret: env.QR_SIGNING_SECRET,
    ttlSeconds: env.QR_TTL_SECONDS,
  });

  const faceBlacklistClient = new FaceBlacklistClient({
    grpcTarget: env.FACE_SERVICE_GRPC_TARGET,
    tenantId: env.FACE_SERVICE_TENANT_ID,
    timeoutMs: env.FACE_SERVICE_TIMEOUT_MS,
    logger,
  });

  const paymentSkeletonService = new PaymentSkeletonService({ rabbitBus });

  const orderService = new OrderService({
    orderRepository,
    membershipRepository,
    processedEventRepository,
    qrService,
    rabbitBus,
    paymentSkeletonService,
    faceBlacklistClient,
    logger,
  });

  const healthController = new HealthController({ rabbitBus });
  const orderController = new OrderController(orderService);

  const jwtVerifier = new JwtVerifier({
    jwksUri: env.JWT_JWKS_URI,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });

  const authMiddleware = authMiddlewareFactory(jwtVerifier);
  const restaurantAccessMiddleware = requireRestaurantAccess({
    membershipRepository,
    restaurantIdExtractor: (req) => req.params.restaurantId,
  });

  return {
    rabbitBus,
    orderService,
    membershipRepository,
    processedEventRepository,
    controllers: {
      healthController,
      orderController,
    },
    middleware: {
      authMiddleware,
      requireRole,
      requireRestaurantAccess: restaurantAccessMiddleware,
    },
  };
};

export const buildApp = async ({ container } = {}) => {
  const app = express();
  const deps = container || (await createContainer());

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
      healthController: deps.controllers.healthController,
      orderController: deps.controllers.orderController,
      authMiddleware: deps.middleware.authMiddleware,
      requireRole: deps.middleware.requireRole,
      requireRestaurantAccess: deps.middleware.requireRestaurantAccess,
    })
  );

  app.use(notFoundMiddleware);
  app.use(errorMiddleware(logger));

  app.locals.container = deps;

  return app;
};

