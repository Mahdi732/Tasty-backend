db = db.getSiblingDB('tasty_notification');

db.createUser({
  user: 'tasty_notification_app',
  pwd: 'notification-app-pass-dev',
  roles: [{ role: 'readWrite', db: 'tasty_notification' }],
});
