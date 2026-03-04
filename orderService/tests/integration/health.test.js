import request from 'supertest';

describe('Order service routes', () => {
  beforeAll(() => {
    process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27020/order-service';
    process.env.JWT_JWKS_URI = process.env.JWT_JWKS_URI || 'http://localhost:4000/.well-known/jwks.json';
    process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'tasty-auth';
    process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'tasty-clients';
    process.env.QR_SIGNING_SECRET = process.env.QR_SIGNING_SECRET || 'change-me-secret';
  });

  test('GET /v1/health returns ok', async () => {
    const { buildApp } = await import('../../src/app.js');

    const app = await buildApp({
      container: {
        controllers: {
          healthController: {
            health: async (_req, res) => res.status(200).json({ success: true, data: { status: 'ok' } }),
            ready: async (_req, res) => res.status(200).json({ success: true, data: { status: 'ready' } }),
          },
          orderController: {
            create: async (_req, res) => res.status(201).json({ success: true, data: {} }),
            myOrders: async (_req, res) => res.status(200).json({ success: true, data: [] }),
            restaurantOrders: async (_req, res) => res.status(200).json({ success: true, data: [] }),
            listAll: async (_req, res) => res.status(200).json({ success: true, data: [] }),
            scanQr: async (_req, res) => res.status(200).json({ success: true, data: {} }),
          },
        },
        middleware: {
          authMiddleware: (_req, _res, next) => next(),
          requireRole: () => (_req, _res, next) => next(),
          requireRestaurantAccess: (_req, _res, next) => next(),
        },
      },
    });

    const res = await request(app).get('/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
