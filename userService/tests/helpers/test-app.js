import request from 'supertest';
import { buildApp } from '../../src/app.js';
import { RedisMock } from './redis-mock.js';
import { MemoryEmailSender } from './memory-email.sender.js';

export const createTestContext = async ({ otpCode = '123456' } = {}) => {
  const redis = new RedisMock();
  const emailSender = new MemoryEmailSender();
  const app = await buildApp({
    redisClient: redis,
    otpGenerator: () => otpCode,
    emailSender,
  });
  return {
    app,
    redis,
    emailSender,
    otpCode,
    request: request(app),
  };
};
