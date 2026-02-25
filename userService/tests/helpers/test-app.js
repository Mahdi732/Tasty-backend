import request from 'supertest';
import { buildApp } from '../../src/app.js';
import { RedisMock } from './redis-mock.js';

export const createTestContext = async () => {
  const redis = new RedisMock();
  const app = await buildApp({ redisClient: redis });
  return {
    app,
    redis,
    request: request(app),
  };
};
