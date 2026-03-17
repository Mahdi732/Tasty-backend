import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env, httpLogger, logger } from './config/index.js';
import { requestIdMiddleware } from './middlewares/request-id.middleware.js';
import { requestTimeoutMiddleware } from './middlewares/timeout.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';

import { PaymentTransactionModel } from './models/payment-transaction.model.js';
import { PaymentTransactionRepository } from './repositories/payment-transaction.repository.js';

import { DomainEventPublisher } from './messaging/domain-event.publisher.js';

import { PaymentService } from './services/payment.service.js';

import { HealthController } from './controllers/health.controller.js';
import { PaymentController } from './controllers/payment.controller.js';

import { buildRoutes } from './routes/index.js';

export const createContainer = async ({ domainEventPublisher } = {}) => {
  const publisher = domainEventPublisher || new DomainEventPublisher({
    url: env.RABBITMQ_URL,
    exchange: env.RABBITMQ_EXCHANGE_EVENTS,
    logger,
  });

  if (!domainEventPublisher) {
    await publisher.connect();
  }

  const transactionRepository = new PaymentTransactionRepository(PaymentTransactionModel);

  const paymentService = new PaymentService({
    transactionRepository,
    domainEventPublisher: publisher,
  });

  const healthController = new HealthController({ domainEventPublisher: publisher });
  const paymentController = new PaymentController(paymentService);

  return {
    publisher,
    services: { paymentService },
    controllers: { healthController, paymentController },
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
      paymentController: deps.controllers.paymentController,
    })
  );

  app.use(notFoundMiddleware);
  app.use(errorMiddleware(logger));

  app.locals.container = deps;

  return app;
};
