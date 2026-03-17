import { buildApp, createContainer } from './app.js';
import { connectMongo, env, logger } from './config/index.js';
import { startGrpcServer } from './grpc/server.js';

let server;
let container;
let grpcServer;

const start = async () => {
  await connectMongo(env.MONGO_URI);
  container = await createContainer();

  const app = await buildApp({ container });
  server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'payment_service_started');
  });

  grpcServer = await startGrpcServer({
    logger,
    internalServiceSecret: env.INTERNAL_SERVICE_SECRET,
    port: env.GRPC_PORT,
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

  if (container?.publisher) {
    await container.publisher.close();
  }

  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((error) => {
  logger.error({ err: error }, 'startup_failed');
  process.exit(1);
});
