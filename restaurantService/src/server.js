import { buildApp, createContainer } from './app.js';
import { connectMongo, createRedis, env, logger } from './config/index.js';
import { DomainEventPublisher } from './messaging/domain-event.publisher.js';
import { startGrpcServer } from './grpc/server.js';

let server;
let redisClient;
let eventPublisher;
let container;
let grpcServer;

const start = async () => {
  await connectMongo(env.MONGO_URI);

  if (env.REDIS_ENABLED) {
    redisClient = await createRedis(env.REDIS_URL);
  }

  if (env.RABBITMQ_ENABLED) {
    eventPublisher = new DomainEventPublisher({
      url: env.RABBITMQ_URL,
      exchange: env.RABBITMQ_EXCHANGE_EVENTS,
      logger,
    });
    await eventPublisher.connect();
  }

  container = await createContainer({ redisClient, domainEventPublisher: eventPublisher });
  const app = await buildApp({ container });
  server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'restaurant_menu_service_started');
  });

  grpcServer = await startGrpcServer({
    publicService: container.services.publicService,
    logger,
    internalServiceSecret: env.INTERNAL_SERVICE_SECRET,
    port: Number(process.env.GRPC_PORT || 50053),
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
  if (redisClient?.isOpen) {
    await redisClient.quit();
  }
  if (eventPublisher) {
    await eventPublisher.close();
  }
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((error) => {
  logger.error({ err: error }, 'startup_failed');
  process.exit(1);
});

