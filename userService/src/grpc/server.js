import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, '../../../common/protos/user.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition);
const userProto = proto.tasty.user.v1;

const toContext = (input = {}) => ({
  ipAddress: input.ip_address || null,
  userAgent: input.user_agent || null,
  deviceId: input.device_id || null,
});

export const startGrpcServer = async ({ authService, userService, logger, port = 50051 }) => {
  const server = new grpc.Server();

  server.addService(userProto.UserService.service, {
    RegisterUser: async (call, callback) => {
      try {
        const req = call.request;
        const result = await authService.register(
          {
            email: req.email,
            password: req.password,
            phoneNumber: req.phone_number,
          },
          toContext(req)
        );

        callback(null, {
          success: true,
          message: result.verificationRequired ? 'verification_required' : 'registered',
          user_id: result.user?.id || '',
          email: result.user?.email || '',
          roles: result.user?.roles || [],
        });
      } catch (error) {
        logger?.error({ err: error }, 'grpc_register_user_failed');
        callback(null, { success: false, message: error.message || 'register_failed' });
      }
    },

    LoginUser: async (call, callback) => {
      try {
        const req = call.request;
        const result = await authService.login(
          {
            email: req.email,
            password: req.password,
          },
          toContext(req)
        );

        callback(null, {
          success: true,
          message: 'logged_in',
          access_token: result.accessToken || '',
          refresh_token: result.refreshToken || '',
          access_token_expires_in: Number(result.accessTokenExpiresIn || 0),
          user_id: result.user?.id || '',
          email: result.user?.email || '',
          roles: result.user?.roles || [],
        });
      } catch (error) {
        logger?.error({ err: error }, 'grpc_login_user_failed');
        callback(null, { success: false, message: error.message || 'login_failed' });
      }
    },

    GetUserProfile: async (call, callback) => {
      try {
        const req = call.request;
        const profile = await userService.getProfile(req.user_id);

        callback(null, {
          success: true,
          message: 'ok',
          user_id: profile.id || '',
          email: profile.email || '',
          phone_number: profile.phoneNumber || '',
          roles: profile.roles || [],
          status: profile.status || '',
          is_email_verified: Boolean(profile.isEmailVerified),
          is_phone_verified: Boolean(profile.isPhoneVerified),
          is_face_verified: Boolean(profile.isFaceVerified),
        });
      } catch (error) {
        logger?.error({ err: error }, 'grpc_get_user_profile_failed');
        callback(null, { success: false, message: error.message || 'get_user_profile_failed' });
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

  logger?.info({ grpcPort: port }, 'user_grpc_server_started');
  return server;
};
