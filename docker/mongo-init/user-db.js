db = db.getSiblingDB('tasty_user');

db.createUser({
  user: 'tasty_user_app',
  pwd: 'user-app-pass-dev',
  roles: [{ role: 'readWrite', db: 'tasty_user' }],
});
