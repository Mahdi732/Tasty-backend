db = db.getSiblingDB('tasty_order');

db.createUser({
  user: 'tasty_order_app',
  pwd: 'order-app-pass-dev',
  roles: [{ role: 'readWrite', db: 'tasty_order' }],
});
