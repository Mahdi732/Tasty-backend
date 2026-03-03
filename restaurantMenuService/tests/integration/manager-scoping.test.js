import request from 'supertest';
import { setupTestApp, teardownTestApp, resetDatabase } from '../helpers/test-app.js';

describe('Manager tenant scoping', () => {
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

  it('manager cannot edit another manager restaurant', async () => {
    const createRes = await request(app)
      .post('/restaurants')
      .set('x-test-user-id', 'manager-a')
      .set('x-test-roles', 'manager')
      .send({
        name: 'Manager A Restaurant',
        location: { city: 'Rabat', citySlug: 'rabat' },
      })
      .expect(201);

    const restaurantId = createRes.body.data._id;

    const updateRes = await request(app)
      .patch(`/restaurants/${restaurantId}`)
      .set('x-test-user-id', 'manager-b')
      .set('x-test-roles', 'manager')
      .send({ description: 'hacked' })
      .expect(403);

    expect(updateRes.body.success).toBe(false);
    expect(updateRes.body.error.code).toBe('TENANT_ACCESS_DENIED');
  });
});
