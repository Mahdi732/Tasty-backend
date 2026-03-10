import { buildApp, createContainer } from './app.js';
import { connectMongo, env, logger } from './config/index.js';
import { registerConsumers } from './consumers/index.js';
import { QrExpiryScammerTrapJob } from './jobs/qr-expiry-scammer-trap.job.js';

let server;
let container;
let scammerTrapJob;

const start = async () => {
  await connectMongo(env.MONGO_URI);
  container = await createContainer();

  await registerConsumers({
    rabbitBus: container.rabbitBus,
    orderService: container.orderService,
    membershipRepository: container.membershipRepository,
    processedEventRepository: container.processedEventRepository,
    logger,
    paymentQueue: env.RABBITMQ_QUEUE_PAYMENT,
    membershipQueue: env.RABBITMQ_QUEUE_RESTAURANT_MEMBERSHIP,
  });

  scammerTrapJob = new QrExpiryScammerTrapJob({
    env,
    orderService: container.orderService,
    logger,
  });
  scammerTrapJob.start();

  const app = await buildApp({ container });
  server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'order_service_started');
  });
};

const shutdown = async (signal) => {
  logger.info({ signal }, 'shutting_down');

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  if (container?.rabbitBus) {
    await container.rabbitBus.close();
  }

  if (scammerTrapJob) {
    scammerTrapJob.stop();
  }

  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((error) => {
  logger.error({ err: error }, 'startup_failed');
  process.exit(1);
});

