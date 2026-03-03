import request from 'supertest';
import { setupTestApp, teardownTestApp, resetDatabase } from '../helpers/test-app.js';
import { RestaurantModel } from '../../src/models/restaurant.model.js';

describe('Public read returns ACTIVE restaurants only', () => {
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

  it('filters out non-active restaurants', async () => {
    await RestaurantModel.create([
      {
        name: 'Active R',
        slug: 'active-r',
        location: { city: 'Casablanca', citySlug: 'casablanca' },
        status: 'ACTIVE',
        subscription: { status: 'ACTIVE' },
        verification: { status: 'VERIFIED' },
        createdBy: 'u1',
        updatedBy: 'u1',
      },
      {
        name: 'Draft R',
        slug: 'draft-r',
        location: { city: 'Casablanca', citySlug: 'casablanca' },
        status: 'DRAFT',
        createdBy: 'u1',
        updatedBy: 'u1',
      },
    ]);

    const response = await request(app).get('/restaurants').expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].slug).toBe('active-r');
  });
});
