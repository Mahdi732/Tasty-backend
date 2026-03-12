import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, '../../../common/protos/notification.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition);
const notificationProto = proto.tasty.notification.v1;

export const startGrpcServer = async ({ enforcementNotificationService, logger, port = 50055 }) => {
  const server = new grpc.Server();

  server.addService(notificationProto.NotificationService.service, {
    EnqueueDriverArrival: async (call, callback) => {
      try {
        const req = call.request;
        await enforcementNotificationService.handleDriverArrived({
          orderId: req.order_id,
          userId: req.user_id,
          restaurantId: req.restaurant_id,
          phoneNumber: req.phone_number || null,
          pushToken: req.push_token || null,
          idNumberMasked: req.id_number_masked || 'UNKNOWN',
          debtAmount: req.debt_amount || 0,
          arrivedAt: req.arrived_at || new Date().toISOString(),
        });

        callback(null, { success: true, message: 'queued' });
      } catch (error) {
        logger?.error({ err: error }, 'grpc_enqueue_driver_arrival_failed');
        callback(null, { success: false, message: error.message || 'enqueue_driver_arrival_failed' });
      }
    },
  });

  await new Promise((resolve, reject) => {
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        server.start();
        resolve();
      }
    );
  });

  logger?.info({ grpcPort: port }, 'notification_grpc_server_started');
  return server;
};
