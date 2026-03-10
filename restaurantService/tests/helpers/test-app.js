import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;
let buildApp;

export const testAuthMiddleware = (req, _res, next) => {
  const userId = req.get('x-test-user-id');
  const rolesHeader = req.get('x-test-roles') || '';
  const roles = rolesHeader.split(',').map((value) => value.trim()).filter(Boolean);

  if (!userId) {
    return next(new Error('x-test-user-id header is required in tests'));
  }

  req.auth = { userId, roles };
  return next();
};

export const setupTestApp = async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0';
  process.env.LOG_LEVEL = 'silent';
  process.env.MONGO_URI = 'mongodb://localhost:27017/test';
  process.env.REDIS_ENABLED = 'false';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.CORS_ORIGINS = 'http://localhost:3000';
  process.env.BODY_LIMIT = '1mb';
  process.env.TRUST_PROXY = '1';
  process.env.REQUEST_TIMEOUT_MS = '10000';
  process.env.JWT_JWKS_URI = 'http://localhost:4000/.well-known/jwks.json';
  process.env.JWT_ISSUER = 'test-issuer';
  process.env.JWT_AUDIENCE = 'test-aud';
  process.env.REQUIRE_VERIFICATION_FOR_ACTIVATION = 'true';
  process.env.DEFAULT_RESTAURANT_CURRENCY = 'USD';
  process.env.PUBLIC_MENU_CACHE_TTL_SECONDS = '30';

  if (!buildApp) {
    ({ buildApp } = await import('../../src/app.js'));
  }

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const app = await buildApp({
    redisClient: null,
    authMiddlewareOverride: testAuthMiddleware,
  });

  return app;
};

export const teardownTestApp = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
};

export const resetDatabase = async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};

