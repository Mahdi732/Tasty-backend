import { describe, it, expect } from '@jest/globals';
import request from 'supertest';

describe('Notification service routes', () => {
  it('GET /v1/health returns ok', async () => {
    process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test-notification';
    process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

    const { buildApp } = await import('../../src/app.js');

    const app = await buildApp({
      container: {
        controllers: {
          healthController: {
            ping: async (_req, res) => {
              res.status(200).json({ success: true, data: { status: 'ok' } });
            },
          },
        },
      },
    });

    const response = await request(app).get('/v1/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
  });
});
