import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { httpLogger, logger } from './config/logger.js';
import { createGrpcClients } from './grpc/clients.js';
import { createAuthMiddleware } from './middlewares/auth.middleware.js';
import { buildApiRoutes } from './routes/api.routes.js';
import { createRequestIdMiddleware } from '../../common/src/middlewares/request-id.middleware.js';
import { buildOpenApiSpec } from './docs/swagger.js';

export const buildApp = () => {
  const app = express();
  const grpcClients = createGrpcClients({ env, logger });
  const authMiddleware = createAuthMiddleware({ env });
  const correlationMiddleware = createRequestIdMiddleware();
  const openApiSpec = buildOpenApiSpec();

  const allowedOrigins = env.CORS_ORIGINS_LIST.filter((origin) => origin && origin !== '*');
  if (allowedOrigins.length !== env.CORS_ORIGINS_LIST.length) {
    throw new Error('CORS_ORIGINS must not include wildcard (*) when credentials are enabled');
  }

  const corsOptions = {
    origin: allowedOrigins,
    credentials: true,
  };

  const normalizeError = (error) => {
    const normalized = error?.error || error;
    return {
      code: String(normalized?.code || 'INTERNAL_ERROR'),
      message: String(normalized?.message || 'Unexpected error'),
      userMessage: String(normalized?.userMessage || normalized?.message || 'Something went wrong. Please try again.'),
      requestId: normalized?.requestId ? String(normalized.requestId) : undefined,
    };
  };

  app.set('trust proxy', env.TRUST_PROXY);
  app.use(correlationMiddleware);
  app.use(httpLogger);
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: env.BODY_LIMIT }));

  app.get('/v1/health', (_req, res) => {
    res.status(200).json({ success: true, data: { status: 'ok' } });
  });

  app.get('/api-docs.json', (_req, res) => {
    res.status(200).json(openApiSpec);
  });
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  );

  app.use(buildApiRoutes({ grpcClients, authMiddleware }));

  app.use((error, _req, res, _next) => {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    res.status(statusCode).json({ success: false, error: normalizeError(error) });
  });

  return app;
};
