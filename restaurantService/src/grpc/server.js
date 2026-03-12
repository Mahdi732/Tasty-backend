import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { createInternalAuthInterceptor } from '../../../common/src/grpc/internal-auth.interceptor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, '../../../common/protos/restaurant.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition);
const restaurantProto = proto.tasty.restaurant.v1;

export const startGrpcServer = async ({ publicService, logger, internalServiceSecret, port = 50053 }) => {
  const server = new grpc.Server();
  const { withInternalAuth } = createInternalAuthInterceptor({
    internalServiceSecret,
    logger,
  });

  server.addService(restaurantProto.RestaurantService.service, {
    EstimateDeliveryTime: withInternalAuth(async (call, callback) => {
      try {
        const req = call.request;
        const result = await publicService.estimateDeliveryTime(req.city_slug, req.slug, {
          itemIds: req.item_ids || [],
          distanceKm: req.distance_km,
          averageSpeedKmph: req.average_speed_kmph || 25,
        });

        callback(null, {
          success: true,
          message: 'ok',
          max_prep_time_minutes: Number(result.maxPrepTimeMinutes || 0),
          travel_minutes: Number(result.travelMinutes || 0),
          estimated_delivery_minutes: Number(result.estimatedDeliveryMinutes || 0),
        });
      } catch (error) {
        logger?.error({ err: error }, 'grpc_estimate_delivery_time_failed');
        callback(null, { success: false, message: error.message || 'estimate_delivery_time_failed' });
      }
    }),
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

  logger?.info({ grpcPort: port }, 'restaurant_grpc_server_started');
  return server;
};
