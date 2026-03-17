db = db.getSiblingDB('tasty_payment');

db.createUser({
  user: 'tasty_payment_app',
  pwd: 'payment-app-pass-dev',
  roles: [{ role: 'readWrite', db: 'tasty_payment' }],
});
