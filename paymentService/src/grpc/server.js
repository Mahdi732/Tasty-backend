import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { createInternalAuthInterceptor } from '../../../common/src/grpc/internal-auth.interceptor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, '../../../common/protos/payment.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition);
const paymentProto = proto.tasty.payment.v1;

export const startGrpcServer = async ({ logger, internalServiceSecret, port = 50055 }) => {
  const server = new grpc.Server();
  const { withInternalAuth } = createInternalAuthInterceptor({
    internalServiceSecret,
    logger,
  });

  server.addService(paymentProto.PaymentService.service, {
    Ping: withInternalAuth(async (_call, callback) => {
      callback(null, {
        success: true,
        message: 'payment_grpc_ok',
      });
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

  logger?.info({ grpcPort: port }, 'payment_grpc_server_started');
  return server;
};
