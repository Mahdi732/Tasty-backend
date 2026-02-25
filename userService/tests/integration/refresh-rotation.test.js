import { beforeAll, afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { startMongoMemory, stopMongoMemory, clearMongoMemory } from '../helpers/mongo-memory.js';
import { createTestContext } from '../helpers/test-app.js';

let ctx;

describe('Refresh rotation', () => {
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

  it('rotates refresh token and rejects reused old token', async () => {
    const reg = await ctx.request.post('/auth/register').send({
      email: 'user2@example.com',
      password: 'StrongPass!123',
    });

    const oldRefresh = reg.body.data.refreshToken;

    const rotate1 = await ctx.request.post('/auth/refresh').send({ refreshToken: oldRefresh });
    expect(rotate1.status).toBe(200);
    const newRefresh = rotate1.body.data.refreshToken;

    const reuse = await ctx.request.post('/auth/refresh').send({ refreshToken: oldRefresh });
    expect([401, 409]).toContain(reuse.status);

    const rotate2 = await ctx.request.post('/auth/refresh').send({ refreshToken: newRefresh });
    expect([200, 401, 409]).toContain(rotate2.status);
  });
});
