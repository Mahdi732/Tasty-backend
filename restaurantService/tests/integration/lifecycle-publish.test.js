import request from 'supertest';
import { setupTestApp, teardownTestApp, resetDatabase } from '../helpers/test-app.js';

describe('Lifecycle request publish', () => {
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

  it('goes to pending when gates fail and active when gates pass', async () => {
    const createRes = await request(app)
      .post('/restaurants')
      .set('x-test-user-id', 'manager-x')
      .set('x-test-roles', 'manager')
      .send({
        name: 'Lifecycle R',
        location: { city: 'Fes', citySlug: 'fes' },
      })
      .expect(201);

    const restaurantId = createRes.body.data._id;

    const pendingRes = await request(app)
      .post(`/restaurants/${restaurantId}/request-publish`)
      .set('x-test-user-id', 'manager-x')
      .set('x-test-roles', 'manager')
      .send({})
      .expect(200);

    expect(pendingRes.body.data.status).toBe('PENDING_SUBSCRIPTION');
    expect(pendingRes.body.data.activationBlockers).toContain('SUBSCRIPTION_INACTIVE');

    await request(app)
      .patch(`/restaurants/${restaurantId}/subscription`)
      .set('x-test-user-id', 'superadmin-1')
      .set('x-test-roles', 'superadmin')
      .send({ status: 'ACTIVE', subscriptionPlanId: 'pro-monthly' })
      .expect(200);

    await request(app)
      .patch(`/restaurants/${restaurantId}/verify`)
      .set('x-test-user-id', 'superadmin-1')
      .set('x-test-roles', 'superadmin')
      .send({ reviewNotes: 'ok' })
      .expect(200);

    const activeRes = await request(app)
      .post(`/restaurants/${restaurantId}/request-publish`)
      .set('x-test-user-id', 'manager-x')
      .set('x-test-roles', 'manager')
      .send({})
      .expect(200);

    expect(activeRes.body.data.status).toBe('ACTIVE');
    expect(activeRes.body.data.activationBlockers).toHaveLength(0);
  });
});
