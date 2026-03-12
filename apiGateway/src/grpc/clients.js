import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { INTERNAL_AUTH_METADATA_KEYS } from '../../../common/src/grpc/internal-auth.interceptor.js';

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

const buildMetadata = ({ env, auth, requestId }) => {
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
  return metadata;
};

const promisifyUnary = (client, method, env) => (payload, context = {}) =>
  new Promise((resolve, reject) => {
    const metadata = buildMetadata({ env, auth: context.auth, requestId: context.requestId });
    client[method](payload, metadata, (err, response) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(response);
    });
  });

export const createGrpcClients = (env) => {
  const credentials = grpc.credentials.createInsecure();

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
      registerUser: promisifyUnary(userClient, 'RegisterUser', env),
      loginUser: promisifyUnary(userClient, 'LoginUser', env),
      getUserProfile: promisifyUnary(userClient, 'GetUserProfile', env),
    },
    order: {
      createOrder: promisifyUnary(orderClient, 'CreateOrder', env),
      markDriverArrived: promisifyUnary(orderClient, 'MarkDriverArrived', env),
    },
    restaurant: {
      estimateDeliveryTime: promisifyUnary(restaurantClient, 'EstimateDeliveryTime', env),
    },
    face: {
      compareIdWithFace: promisifyUnary(faceClient, 'CompareIdWithFace', env),
    },
    notification: {
      enqueueDriverArrival: promisifyUnary(notificationClient, 'EnqueueDriverArrival', env),
    },
  };
};
