import request from 'supertest';
import { setupTestApp, teardownTestApp, resetDatabase } from '../helpers/test-app.js';

describe('Public menu visibility', () => {
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

  it('shows only published menu items for active restaurants', async () => {
    const createRestaurantRes = await request(app)
      .post('/restaurants')
      .set('x-test-user-id', 'manager-z')
      .set('x-test-roles', 'manager')
      .send({ name: 'Menu R', location: { city: 'Marrakech', citySlug: 'marrakech' } })
      .expect(201);

    const restaurantId = createRestaurantRes.body.data._id;

    await request(app)
      .patch(`/restaurants/${restaurantId}/subscription`)
      .set('x-test-user-id', 'superadmin-1')
      .set('x-test-roles', 'superadmin')
      .send({ status: 'ACTIVE', planId: 'starter' })
      .expect(200);

    await request(app)
      .patch(`/restaurants/${restaurantId}/verify`)
      .set('x-test-user-id', 'superadmin-1')
      .set('x-test-roles', 'superadmin')
      .send({ reviewNotes: 'verified' })
      .expect(200);

    await request(app)
      .post(`/restaurants/${restaurantId}/request-publish`)
      .set('x-test-user-id', 'manager-z')
      .set('x-test-roles', 'manager')
      .send({})
      .expect(200);

    const categoryRes = await request(app)
      .post(`/restaurants/${restaurantId}/menu/categories`)
      .set('x-test-user-id', 'manager-z')
      .set('x-test-roles', 'manager')
      .send({ name: 'Main' })
      .expect(201);

    const categoryId = categoryRes.body.data._id;

    await request(app)
      .post(`/restaurants/${restaurantId}/menu/items`)
      .set('x-test-user-id', 'manager-z')
      .set('x-test-roles', 'manager')
      .send({
        categoryId,
        name: 'Visible Burger',
        basePrice: 12,
        currency: 'USD',
        isPublished: true,
        availability: 'IN_STOCK',
      })
      .expect(201);

    await request(app)
      .post(`/restaurants/${restaurantId}/menu/items`)
      .set('x-test-user-id', 'manager-z')
      .set('x-test-roles', 'manager')
      .send({
        categoryId,
        name: 'Hidden Burger',
        basePrice: 15,
        currency: 'USD',
        isPublished: false,
        availability: 'IN_STOCK',
      })
      .expect(201);

    const publicMenuRes = await request(app)
      .get('/restaurants/marrakech/menu-r/menu')
      .expect(200);

    const firstCategory = publicMenuRes.body.data.categories[0];
    expect(firstCategory.items).toHaveLength(1);
    expect(firstCategory.items[0].name).toBe('Visible Burger');
  });
});
