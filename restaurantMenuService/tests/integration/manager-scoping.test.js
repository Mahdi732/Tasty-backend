import request from 'supertest';
import { setupTestApp, teardownTestApp, resetDatabase } from '../helpers/test-app.js';

describe('Manager restaurant scoping', () => {
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

  it('same manager can manage multiple restaurants', async () => {
    const createA = await request(app)
      .post('/restaurants')
      .set('x-test-user-id', 'manager-a')
      .set('x-test-roles', 'manager')
      .send({
        name: 'Manager A Restaurant 1',
        location: { city: 'Rabat', citySlug: 'rabat' },
      })
      .expect(201);

    const createB = await request(app)
      .post('/restaurants')
      .set('x-test-user-id', 'manager-a')
      .set('x-test-roles', 'manager')
      .send({
        name: 'Manager A Restaurant 2',
        location: { city: 'Rabat', citySlug: 'rabat' },
      })
      .expect(201);

    await request(app)
      .patch(`/restaurants/${createA.body.data._id}`)
      .set('x-test-user-id', 'manager-a')
      .set('x-test-roles', 'manager')
      .send({ description: 'updated-a' })
      .expect(200);

    await request(app)
      .patch(`/restaurants/${createB.body.data._id}`)
      .set('x-test-user-id', 'manager-a')
      .set('x-test-roles', 'manager')
      .send({ description: 'updated-b' })
      .expect(200);
  });
});
