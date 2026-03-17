import pino from 'pino';
import pinoHttp from 'pino-http';
import { env } from './env.js';
import { getRequestContext } from '../../../common/src/tracing/context.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: ['req.headers.authorization'],
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
});
