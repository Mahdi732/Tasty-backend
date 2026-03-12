db = db.getSiblingDB('tasty_restaurant');

db.createUser({
  user: 'tasty_restaurant_app',
  pwd: 'restaurant-app-pass-dev',
  roles: [{ role: 'readWrite', db: 'tasty_restaurant' }],
});
