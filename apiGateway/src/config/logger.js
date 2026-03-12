import pino from 'pino';
import pinoHttp from 'pino-http';
import { env } from './env.js';

export const logger = pino({
  name: 'api-gateway',
  level: env.LOG_LEVEL,
});

export const httpLogger = pinoHttp({ logger });
