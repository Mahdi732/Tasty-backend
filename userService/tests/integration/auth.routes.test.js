import { beforeAll, afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { decodeJwt } from 'jose';
import { startMongoMemory, stopMongoMemory, clearMongoMemory } from '../helpers/mongo-memory.js';
import { createTestContext } from '../helpers/test-app.js';

let ctx;

describe('Auth routes', () => {
  beforeAll(async () => {
    await startMongoMemory();
    ctx = await createTestContext();
  });

  beforeEach(async () => {
    await clearMongoMemory();
  });

  afterAll(async () => {
    await stopMongoMemory();
  });

  it('register + login + profile works with pending face activation policy', async () => {
    const registerRes = await ctx.request.post('/auth/register').send({
      email: 'user1@example.com',
      password: 'StrongPass!123',
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.success).toBe(true);
    expect(registerRes.body.data.verificationRequired).toBe(true);

    const preVerifyLogin = await ctx.request.post('/auth/login').send({
      email: 'user1@example.com',
      password: 'StrongPass!123',
    });

    expect(preVerifyLogin.status).toBe(403);
    expect(preVerifyLogin.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    expect(preVerifyLogin.body.meta.verificationRequired).toBe(true);

    const otp = ctx.emailSender.latestOtpFor('user1@example.com');
    const verifyRes = await ctx.request.post('/auth/email/verify').send({
      email: 'user1@example.com',
      code: otp,
    });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.verified).toBe(true);

    const loginRes = await ctx.request.post('/auth/login').send({
      email: 'user1@example.com',
      password: 'StrongPass!123',
    });

    expect(loginRes.status).toBe(200);
    const accessToken = loginRes.body.data.accessToken;
    const claims = decodeJwt(accessToken);

    expect(claims.sub).toBeTruthy();
    expect(Array.isArray(claims.roles)).toBe(true);
    expect(claims.roles).toContain('user');
    expect(claims.tenantId).toBeUndefined();

    const meRes = await ctx.request
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(403);

    const profileRes = await ctx.request
      .get('/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.email).toBe('user1@example.com');
    expect(profileRes.body.data.status).toBe('PENDING_FACE_ACTIVATION');
  });
});
