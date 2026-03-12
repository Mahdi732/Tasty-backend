import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { INTERNAL_AUTH_METADATA_KEYS } from '../../../common/src/grpc/internal-auth.interceptor.js';
import { CircuitBreaker, GatewayUpstreamError } from './circuit-breaker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const protoRoot = path.resolve(__dirname, '../../../common/protos');

const loadProto = (name) => {
  const packageDefinition = protoLoader.loadSync(path.join(protoRoot, name), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  return grpc.loadPackageDefinition(packageDefinition);
};

const buildMetadata = ({ env, auth, requestId, correlationId }) => {
  const metadata = new grpc.Metadata();
  metadata.set(INTERNAL_AUTH_METADATA_KEYS.internalSecret, env.INTERNAL_SERVICE_SECRET);
  if (auth?.userId) metadata.set(INTERNAL_AUTH_METADATA_KEYS.userId, auth.userId);
  if (auth?.status) metadata.set(INTERNAL_AUTH_METADATA_KEYS.userStatus, auth.status);
  if (Array.isArray(auth?.roles)) {
    metadata.set(INTERNAL_AUTH_METADATA_KEYS.userRoles, JSON.stringify(auth.roles));
  }
  if (requestId) {
    metadata.set(INTERNAL_AUTH_METADATA_KEYS.requestId, requestId);
  }
  if (correlationId) {
    metadata.set(INTERNAL_AUTH_METADATA_KEYS.correlationId, correlationId);
  }
  return metadata;
};

const toUpstreamError = (serviceName, error) => {
  if (error instanceof GatewayUpstreamError) {
    return error;
  }

  const isTimeout = Number(error?.code) === grpc.status.DEADLINE_EXCEEDED;
  return new GatewayUpstreamError(
    isTimeout
      ? `${serviceName} deadline exceeded`
      : `${serviceName} unavailable`,
    {
      serviceName,
      errorCode: isTimeout ? 'UPSTREAM_DEADLINE_EXCEEDED' : 'UPSTREAM_SERVICE_UNAVAILABLE',
      isTimeout,
      cause: error,
    }
  );
};

const promisifyUnary = ({ client, method, env, serviceName, circuitBreaker, fallback }) => (payload, context = {}) =>
  new Promise((resolve, reject) => {
    const metadata = buildMetadata({
      env,
      auth: context.auth,
      requestId: context.requestId,
      correlationId: context.correlationId || context.requestId,
    });
    const options = {
      deadline: Date.now() + env.GRPC_DEADLINE_MS,
    };

    circuitBreaker
      .execute(
        () =>
          new Promise((innerResolve, innerReject) => {
            client[method](payload, metadata, options, (err, response) => {
              if (err) {
                innerReject(toUpstreamError(serviceName, err));
                return;
              }
              innerResolve(response);
            });
          })
      )
      .then(resolve)
      .catch((error) => {
        if (fallback) {
          resolve(fallback(error));
          return;
        }
        reject(toUpstreamError(serviceName, error));
      });
  });

export const createGrpcClients = ({ env, logger }) => {
  const credentials = grpc.credentials.createInsecure();

  const breakerConfig = {
    failureThreshold: env.GRPC_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    resetTimeoutMs: env.GRPC_CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
  };

  const serviceBreakers = {
    user: new CircuitBreaker({ name: 'user-service', logger, ...breakerConfig }),
    order: new CircuitBreaker({ name: 'order-service', logger, ...breakerConfig }),
    restaurant: new CircuitBreaker({ name: 'restaurant-service', logger, ...breakerConfig }),
    face: new CircuitBreaker({ name: 'face-recognition-service', logger, ...breakerConfig }),
    notification: new CircuitBreaker({ name: 'notification-service', logger, ...breakerConfig }),
  };

  const userDef = loadProto('user.proto');
  const orderDef = loadProto('order.proto');
  const restaurantDef = loadProto('restaurant.proto');
  const faceDef = loadProto('face.proto');
  const notificationDef = loadProto('notification.proto');

  const userClient = new userDef.tasty.user.v1.UserService(env.USER_GRPC_TARGET, credentials);
  const orderClient = new orderDef.tasty.order.v1.OrderService(env.ORDER_GRPC_TARGET, credentials);
  const restaurantClient = new restaurantDef.tasty.restaurant.v1.RestaurantService(env.RESTAURANT_GRPC_TARGET, credentials);
  const faceClient = new faceDef.tasty.face.v1.FaceService(env.FACE_GRPC_TARGET, credentials);
  const notificationClient = new notificationDef.tasty.notification.v1.NotificationService(env.NOTIFICATION_GRPC_TARGET, credentials);

  return {
    user: {
      registerUser: promisifyUnary({
        client: userClient,
        method: 'RegisterUser',
        env,
        serviceName: 'user-service',
        circuitBreaker: serviceBreakers.user,
      }),
      loginUser: promisifyUnary({
        client: userClient,
        method: 'LoginUser',
        env,
        serviceName: 'user-service',
        circuitBreaker: serviceBreakers.user,
      }),
      getUserProfile: promisifyUnary({
        client: userClient,
        method: 'GetUserProfile',
        env,
        serviceName: 'user-service',
        circuitBreaker: serviceBreakers.user,
      }),
    },
    order: {
      createOrder: promisifyUnary({
        client: orderClient,
        method: 'CreateOrder',
        env,
        serviceName: 'order-service',
        circuitBreaker: serviceBreakers.order,
      }),
      markDriverArrived: promisifyUnary({
        client: orderClient,
        method: 'MarkDriverArrived',
        env,
        serviceName: 'order-service',
        circuitBreaker: serviceBreakers.order,
      }),
    },
    restaurant: {
      estimateDeliveryTime: promisifyUnary({
        client: restaurantClient,
        method: 'EstimateDeliveryTime',
        env,
        serviceName: 'restaurant-service',
        circuitBreaker: serviceBreakers.restaurant,
        fallback: () => ({
          success: true,
          degraded: true,
          message: 'ETA temporarily unavailable. Showing fallback estimate.',
          max_prep_time_minutes: 0,
          travel_minutes: 0,
          estimated_delivery_minutes: 0,
        }),
      }),
    },
    face: {
      compareIdWithFace: promisifyUnary({
        client: faceClient,
        method: 'CompareIdWithFace',
        env,
        serviceName: 'face-recognition-service',
        circuitBreaker: serviceBreakers.face,
      }),
    },
    notification: {
      enqueueDriverArrival: promisifyUnary({
        client: notificationClient,
        method: 'EnqueueDriverArrival',
        env,
        serviceName: 'notification-service',
        circuitBreaker: serviceBreakers.notification,
      }),
    },
  };
};
