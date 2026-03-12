db = db.getSiblingDB('tasty_face');

db.createUser({
  user: 'tasty_face_app',
  pwd: 'face-app-pass-dev',
  roles: [{ role: 'readWrite', db: 'tasty_face' }],
});
