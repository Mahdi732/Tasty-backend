import { buildApp } from './app.js';
import { env, logger, connectMongo, createRedisClient } from './config/index.js';

let redisClient;
let server;

const start = async () => {
  await connectMongo(env.MONGO_URI);
  redisClient = await createRedisClient(env.REDIS_URL);

  const app = await buildApp({ redisClient });
  server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'auth_service_started');
  });
};

const shutdown = async (signal) => {
  logger.info({ signal }, 'shutting_down');
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (redisClient) {
    await redisClient.quit();
  }
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((error) => {
  logger.error({ err: error }, 'startup_failed');
  process.exit(1);
});
