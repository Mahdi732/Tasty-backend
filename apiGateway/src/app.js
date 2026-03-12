import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { httpLogger, logger } from './config/logger.js';
import { createGrpcClients } from './grpc/clients.js';
import { createAuthMiddleware } from './middlewares/auth.middleware.js';
import { buildApiRoutes } from './routes/api.routes.js';
import { createRequestIdMiddleware } from '../../../common/src/middlewares/request-id.middleware.js';

export const buildApp = () => {
  const app = express();
  const grpcClients = createGrpcClients({ env, logger });
  const authMiddleware = createAuthMiddleware({ env });
  const correlationMiddleware = createRequestIdMiddleware();

  app.set('trust proxy', env.TRUST_PROXY);
  app.use(correlationMiddleware);
  app.use(httpLogger);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS_LIST }));
  app.use(express.json({ limit: env.BODY_LIMIT }));

  app.get('/v1/health', (_req, res) => {
    res.status(200).json({ success: true, data: { status: 'ok' } });
  });

  app.use(buildApiRoutes({ grpcClients, authMiddleware }));

  app.use((error, _req, res, _next) => {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message || 'Unexpected error' } });
  });

  return app;
};
