import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env, httpLogger, logger } from './config/index.js';
import { requestIdMiddleware } from './middlewares/request-id.middleware.js';
import { requestTimeoutMiddleware } from './middlewares/timeout.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { buildRoutes } from './routes/index.js';
import { HealthController } from './controllers/health.controller.js';
import { RabbitBus } from './messaging/rabbit.js';
import { EnforcementTimerModel } from './models/enforcement-timer.model.js';
import { OrderStateModel } from './models/order-state.model.js';
import { EnforcementTimerRepository } from './repositories/enforcement-timer.repository.js';
import { OrderStateRepository } from './repositories/order-state.repository.js';
import { EnforcementTemplates } from './services/templates/enforcement.templates.js';
import { NoopPushSender } from './services/channels/noop-push.sender.js';
import { FcmPushSender } from './services/channels/fcm-push.sender.js';
import { NoopSmsSender } from './services/channels/noop-sms.sender.js';
import { TwilioSmsSender } from './services/channels/twilio-sms.sender.js';
import { InfobipSmsSender } from './services/channels/infobip-sms.sender.js';
import { EnforcementNotificationService } from './services/enforcement-notification.service.js';
import { createRealtimeGateway } from './realtime/socket-gateway.js';

export const createContainer = async () => {
  const rabbitBus = new RabbitBus({
    url: env.RABBITMQ_URL,
    eventsExchange: env.RABBITMQ_EXCHANGE_EVENTS,
    commandsExchange: env.RABBITMQ_EXCHANGE_COMMANDS,
    prefetch: env.RABBITMQ_PREFETCH,
    logger,
  });
  await rabbitBus.connect();

  const timerRepository = new EnforcementTimerRepository(EnforcementTimerModel);
  const orderStateRepository = new OrderStateRepository(OrderStateModel);
  const templates = new EnforcementTemplates();
  const realtimeGateway = createRealtimeGateway({ env, logger });

  let pushSender = new NoopPushSender();
  if (env.PUSH_PROVIDER === 'fcm') {
    pushSender = new FcmPushSender({
      serverKey: env.FCM_SERVER_KEY,
      logger,
    });
  }

  let smsSender = new NoopSmsSender();
  if (env.SMS_PROVIDER === 'twilio') {
    smsSender = new TwilioSmsSender({
      accountSid: env.TWILIO_ACCOUNT_SID,
      authToken: env.TWILIO_AUTH_TOKEN,
      fromPhone: env.SMS_FROM_PHONE,
      logger,
    });
  } else if (env.SMS_PROVIDER === 'infobip') {
    smsSender = new InfobipSmsSender({
      baseUrl: env.INFOBIP_BASE_URL,
      apiKey: env.INFOBIP_API_KEY,
      fromPhone: env.SMS_FROM_PHONE,
      logger,
    });
  }

  const enforcementNotificationService = new EnforcementNotificationService({
    env,
    logger,
    rabbitBus,
    timerRepository,
    orderStateRepository,
    pushSender,
    smsSender,
    templates,
    realtimeGateway,
  });

  return {
    rabbitBus,
    enforcementNotificationService,
    realtimeGateway,
    controllers: {
      healthController: new HealthController(),
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
    })
  );

  app.use(notFoundMiddleware);
  app.use(errorMiddleware(logger));

  app.locals.container = deps;

  return app;
};
