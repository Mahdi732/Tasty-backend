import pino from 'pino';
import pinoHttp from 'pino-http';
import { env } from './env.js';

export const logger = pino({
  name: 'notification-service',
  level: env.LOG_LEVEL,
});

export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
