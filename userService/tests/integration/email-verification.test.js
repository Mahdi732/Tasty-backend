import { beforeAll, afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { startMongoMemory, stopMongoMemory, clearMongoMemory } from '../helpers/mongo-memory.js';
import { createTestContext } from '../helpers/test-app.js';

describe('Email verification flow', () => {
  let ctx;

  beforeAll(async () => {
    await startMongoMemory();
    ctx = await createTestContext({ otpCode: '123456' });
  });

  beforeEach(async () => {
    await clearMongoMemory();
    ctx.emailSender.sent = [];
    ctx.redis.store.clear();
  });

  afterAll(async () => {
    await stopMongoMemory();
  });

  it('register then login fails with EMAIL_NOT_VERIFIED', async () => {
    await ctx.request.post('/auth/register').send({
      email: 'pending@example.com',
      password: 'StrongPass!123',
    });

    const loginRes = await ctx.request.post('/auth/login').send({
      email: 'pending@example.com',
      password: 'StrongPass!123',
    });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.success).toBe(false);
    expect(loginRes.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    expect(loginRes.body.meta.verificationRequired).toBe(true);
  });

  it('send verification, verify, then login succeeds', async () => {
    await ctx.request.post('/auth/register').send({
      email: 'verifyme@example.com',
      password: 'StrongPass!123',
    });

    const resendRes = await ctx.request.post('/auth/email/start-verification').send({
      email: 'verifyme@example.com',
    });
    expect([200, 429]).toContain(resendRes.status);

    const verifyRes = await ctx.request.post('/auth/email/verify').send({
      email: 'verifyme@example.com',
      code: '123456',
    });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.verified).toBe(true);

    const loginRes = await ctx.request.post('/auth/login').send({
      email: 'verifyme@example.com',
      password: 'StrongPass!123',
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeTruthy();
  });

  it('locks verification attempts after too many wrong OTP entries', async () => {
    await ctx.request.post('/auth/register').send({
      email: 'locked@example.com',
      password: 'StrongPass!123',
    });

    for (let i = 0; i < 4; i += 1) {
      const wrong = await ctx.request.post('/auth/email/verify').send({
        email: 'locked@example.com',
        code: '000000',
      });
      expect([400, 429]).toContain(wrong.status);
    }

    const locked = await ctx.request.post('/auth/email/verify').send({
      email: 'locked@example.com',
      code: '000000',
    });

    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe('AUTH_VERIFICATION_LOCKED');
  });

  it('enforces resend cooldown', async () => {
    await ctx.request.post('/auth/register').send({
      email: 'cooldown@example.com',
      password: 'StrongPass!123',
    });

    const resend = await ctx.request.post('/auth/email/start-verification').send({
      email: 'cooldown@example.com',
    });

    expect(resend.status).toBe(429);
    expect(resend.body.error.code).toBe('AUTH_VERIFICATION_COOLDOWN');
  });
});
