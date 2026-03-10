import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

export const createRateLimiter = (redisClient, options) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...(redisClient && process.env.NODE_ENV !== 'test'
      ? {
          store: new RedisStore({
            sendCommand: (...args) => redisClient.sendCommand(args),
          }),
        }
      : {}),
    ...options,
  });

