import pino from 'pino';
import pinoHttp from 'pino-http';
import { env } from './env.js';
import { getRequestContext } from '../../../common/src/tracing/context.js';

export const logger = pino({
  name: 'notification-service',
  level: env.LOG_LEVEL,
  mixin: () => {
    const context = getRequestContext();
    return context?.correlationId ? { correlationId: context.correlationId } : {};
  },
});

export const httpLogger = pinoHttp({
  logger,
  customProps: (req) => ({
    requestId: req.requestId,
    correlationId: req.correlationId || req.requestId,
  }),
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
