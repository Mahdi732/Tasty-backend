import request from 'supertest';
import { setupTestApp, teardownTestApp, resetDatabase } from '../helpers/test-app.js';

describe('Manager creation limitation', () => {
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

  it('blocks creating a second restaurant while first is draft and unpaid', async () => {
    await request(app)
      .post('/restaurants')
      .set('x-test-user-id', 'manager-limit')
      .set('x-test-roles', 'manager')
      .send({ name: 'Draft One', location: { city: 'Rabat', citySlug: 'rabat' } })
      .expect(201);

    const second = await request(app)
      .post('/restaurants')
      .set('x-test-user-id', 'manager-limit')
      .set('x-test-roles', 'manager')
      .send({ name: 'Draft Two', location: { city: 'Rabat', citySlug: 'rabat' } })
      .expect(409);

    expect(second.body.error.code).toBe('CONFLICT');
  });
});
