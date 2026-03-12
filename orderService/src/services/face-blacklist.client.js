import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTO_PATH = path.resolve(__dirname, '../../../common/protos/face.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition);
const FaceServiceClient = proto.tasty.face.v1.FaceService;

const unary = (client, method, payload) =>
  new Promise((resolve, reject) => {
    client[method](payload, (error, response) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(response);
    });
  });

export class FaceBlacklistClient {
  constructor({ grpcTarget, tenantId, timeoutMs, logger }) {
    this.tenantId = tenantId;
    this.timeoutMs = timeoutMs;
    this.logger = logger;
    this.client = new FaceServiceClient(
      grpcTarget || 'localhost:50054',
      grpc.credentials.createInsecure()
    );
  }

  async addDebtor({ userId, debtAmount, requestId }) {
    try {
      const response = await Promise.race([
        unary(this.client, 'BlacklistDebtor', {
          tenant_id: this.tenantId,
          person_ref: userId,
          reason: `QR_EXPIRED_DEBT:${debtAmount}`,
          request_id: requestId || '',
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('grpc_timeout')), this.timeoutMs)),
      ]);

      if (!response?.success) {
        throw new ApiError(502, ERROR_CODES.INTERNAL_ERROR, response?.message || 'Failed to sync debtor to face blacklist');
      }

      return { synced: true };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      this.logger.error({ err: error, userId }, 'face_blacklist_unreachable');
      throw new ApiError(503, ERROR_CODES.INTERNAL_ERROR, 'Face blacklist service unavailable');
    }
  }
}
