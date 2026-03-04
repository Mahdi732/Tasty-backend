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

  it('allows user order creation and restricts manager restaurant order access', async () => {
    const restaurantRes = await request(app)
      .post('/restaurants')
      .set('x-test-user-id', 'manager-orders')
      .set('x-test-roles', 'manager')
      .send({ name: 'Orders R', location: { city: 'Agadir', citySlug: 'agadir' } })
      .expect(201);

    const restaurantId = restaurantRes.body.data._id;

    const orderRes = await request(app)
      .post('/orders')
      .set('x-test-user-id', 'user-1')
      .set('x-test-roles', 'user')
      .send({
        restaurantId,
        items: [{ menuItemId: 'item-1', quantity: 2 }],
      })
      .expect(201);

    expect(orderRes.body.data.userId).toBe('user-1');
    expect(orderRes.body.data.restaurantId).toBe(restaurantId);

    await request(app)
      .get(`/orders/restaurant/${restaurantId}`)
      .set('x-test-user-id', 'manager-other')
      .set('x-test-roles', 'manager')
      .expect(403);

    const ownerView = await request(app)
      .get(`/orders/restaurant/${restaurantId}`)
      .set('x-test-user-id', 'manager-orders')
      .set('x-test-roles', 'manager')
      .expect(200);

    expect(ownerView.body.data).toHaveLength(1);

    const superadminView = await request(app)
      .get('/admin/orders')
      .set('x-test-user-id', 'superadmin-1')
      .set('x-test-roles', 'superadmin')
      .expect(200);

    expect(superadminView.body.data).toHaveLength(1);
  });
});
