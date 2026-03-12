import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env, httpLogger, logger } from './config/index.js';
import { requestIdMiddleware } from './middlewares/request-id.middleware.js';
import { requestTimeoutMiddleware } from './middlewares/timeout.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { serviceAuthMiddleware as serviceAuthMiddlewareFactory } from './middlewares/auth.middleware.js';

import { PythonEmbedderClient } from './services/python-embedder.client.js';
import { VectorRepository } from './services/vector.repository.js';
import { FaceService } from './services/face.service.js';

import { HealthController } from './controllers/health.controller.js';
import { FaceController } from './controllers/face.controller.js';
import { buildRoutes } from './routes/index.js';

export const createContainer = async () => {
  const embedderClient = new PythonEmbedderClient({
    baseUrl: env.PYTHON_EMBEDDER_URL,
  });

  const vectorRepository = new VectorRepository();

  const faceService = new FaceService({
    env,
    logger,
    vectorRepository,
    embedderClient,
  });

  const healthController = new HealthController({ embedderClient });
  const faceController = new FaceController(faceService);

  return {
    services: {
      faceService,
    },
    controllers: {
      healthController,
      faceController,
    },
    middlewares: {
      serviceAuthMiddleware: serviceAuthMiddlewareFactory(env.SERVICE_API_KEY),
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
      faceController: deps.controllers.faceController,
      serviceAuthMiddleware: deps.middlewares.serviceAuthMiddleware,
    })
  );

  app.use(notFoundMiddleware);
  app.use(errorMiddleware(logger));

  app.locals.container = deps;

  return app;
};

