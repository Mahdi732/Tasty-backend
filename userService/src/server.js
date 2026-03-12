import { buildApp } from './app.js';
import { env, logger, connectMongo, createRedisClient } from './config/index.js';
import { createGrpcContainer } from './grpc/container.js';
import { startGrpcServer } from './grpc/server.js';

let redisClient;
let server;
let appInstance;
let grpcServer;

const start = async () => {
  await connectMongo(env.MONGO_URI);
  redisClient = await createRedisClient(env.REDIS_URL);

  appInstance = await buildApp({ redisClient });
  server = appInstance.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'auth_service_started');
  });

  const grpcContainer = await createGrpcContainer({ redisClient });
  grpcServer = await startGrpcServer({
    authService: grpcContainer.authService,
    userService: grpcContainer.userService,
    logger,
    port: Number(process.env.GRPC_PORT || 50051),
  });
};

const shutdown = async (signal) => {
  logger.info({ signal }, 'shutting_down');
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (grpcServer) {
    await new Promise((resolve) => grpcServer.tryShutdown(resolve));
  }
  if (redisClient) {
    await redisClient.quit();
  }

  const cleanupJob = appInstance?.locals?.pendingFaceActivationCleanupJob;
  if (cleanupJob) {
    cleanupJob.stop();
  }

  const domainEventPublisher = appInstance?.locals?.domainEventPublisher;
  if (domainEventPublisher) {
    await domainEventPublisher.close();
  }

  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((error) => {
  logger.error({ err: error }, 'startup_failed');
  process.exit(1);
});

