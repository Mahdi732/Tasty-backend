import pino from 'pino';
import pinoHttp from 'pino-http';
import { env } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
  base: { service: 'auth-service' },
});

export const httpLogger = pinoHttp({
  logger,
  customProps: (req) => ({ requestId: req.requestId }),
});
