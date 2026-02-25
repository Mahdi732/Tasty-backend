import { beforeAll, afterAll, beforeEach, describe, expect, it } from '@jest/globals';
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

  it('register + login + me works', async () => {
    const registerRes = await ctx.request.post('/auth/register').send({
      email: 'user1@example.com',
      password: 'StrongPass!123',
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.success).toBe(true);
    expect(registerRes.body.data.accessToken).toBeTruthy();

    const loginRes = await ctx.request.post('/auth/login').send({
      email: 'user1@example.com',
      password: 'StrongPass!123',
    });

    expect(loginRes.status).toBe(200);
    const accessToken = loginRes.body.data.accessToken;

    const meRes = await ctx.request
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe('user1@example.com');
  });
});
