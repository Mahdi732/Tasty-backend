import { buildApp } from './app.js';
import { connectMongo, createRedis, env, logger } from './config/index.js';

let server;
let redisClient;

const start = async () => {
  await connectMongo(env.MONGO_URI);

  if (env.REDIS_ENABLED) {
    redisClient = await createRedis(env.REDIS_URL);
  }

  const app = await buildApp({ redisClient });
  server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'restaurant_menu_service_started');
  });
};

const shutdown = async (signal) => {
  logger.info({ signal }, 'shutting_down');
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (redisClient?.isOpen) {
    await redisClient.quit();
  }
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((error) => {
  logger.error({ err: error }, 'startup_failed');
  process.exit(1);
});
