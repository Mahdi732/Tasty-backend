import { buildApp } from './app.js';
import { connectMongo, env, logger } from './config/index.js';
import { startGrpcServer } from './grpc/server.js';

let server;
let grpcServer;

const start = async () => {
  await connectMongo(env.MONGO_URI);

  const app = await buildApp();
  server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'face_recognition_service_started');
  });

  const faceService = app.locals.container?.services?.faceService;
  grpcServer = await startGrpcServer({
    faceService,
    logger,
    port: Number(process.env.GRPC_PORT || 50054),
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

  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((error) => {
  logger.error({ err: error }, 'startup_failed');
  process.exit(1);
});

