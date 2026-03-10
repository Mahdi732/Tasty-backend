import request from 'supertest';
import { setupTestApp, teardownTestApp, resetDatabase } from '../helpers/test-app.js';

describe('Orders access control', () => {
  let app;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns not found for legacy order endpoints after service split', async () => {
    const restaurantRes = await request(app)
      .post('/restaurants')
      .set('x-test-user-id', 'manager-orders')
      .set('x-test-roles', 'manager')
      .send({ name: 'Orders R', location: { city: 'Agadir', citySlug: 'agadir' } })
      .expect(201);

    const restaurantId = restaurantRes.body.data._id;

    await request(app)
      .post('/orders')
      .set('x-test-user-id', 'user-1')
      .set('x-test-roles', 'user')
      .send({
        restaurantId,
        items: [{ menuItemId: 'item-1', quantity: 2 }],
      })
      .expect(404);

    await request(app)
      .get(`/orders/restaurant/${restaurantId}`)
      .set('x-test-user-id', 'manager-other')
      .set('x-test-roles', 'manager')
      .expect(404);

    await request(app)
      .get('/admin/orders')
      .set('x-test-user-id', 'superadmin-1')
      .set('x-test-roles', 'superadmin')
      .expect(404);
  });
});

