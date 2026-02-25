import { beforeAll, afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { startMongoMemory, stopMongoMemory, clearMongoMemory } from '../helpers/mongo-memory.js';
import { createTestContext } from '../helpers/test-app.js';

let ctx;

describe('Protected route access', () => {
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

  it('denies /auth/me without token', async () => {
    const res = await ctx.request.get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('denies /auth/me with invalid token', async () => {
    const res = await ctx.request.get('/auth/me').set('Authorization', 'Bearer invalid');
    expect(res.status).toBe(401);
  });
});
