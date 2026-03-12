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

export class FaceRecognitionClient {
  constructor({ grpcTarget, timeoutMs, logger }) {
    this.timeoutMs = timeoutMs;
    this.logger = logger;
    this.client = new FaceServiceClient(
      grpcTarget || 'localhost:50054',
      grpc.credentials.createInsecure()
    );
  }

  async safeCall(method, payload) {
    try {
      const response = await Promise.race([
        unary(this.client, method, payload),
        new Promise((_, reject) => setTimeout(() => reject(new Error('grpc_timeout')), this.timeoutMs)),
      ]);

      if (!response?.success) {
        throw new ApiError(503, ERROR_CODES.FACE_SERVICE_UNAVAILABLE, response?.message || 'Face service request failed');
      }
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      this.logger.warn({ err: error }, 'face_service_unreachable');
      throw new ApiError(503, ERROR_CODES.FACE_SERVICE_UNAVAILABLE, 'Face service is unavailable');
    }
  }

  async searchWatchlists({ imageBase64, tenantId, threshold, requestId }) {
    const data = await this.safeCall('SearchWatchlists', {
      image_base64: imageBase64,
      tenant_id: tenantId,
      threshold,
      request_id: requestId || '',
    });

    return {
      decision: data.decision,
      candidates: (data.candidates || []).map((candidate) => ({
        personRef: candidate.person_ref,
        listType: candidate.list_type,
        score: candidate.score,
      })),
    };
  }

  async activateIdentity({ imageBase64, tenantId, personRef, requestId }) {
    const data = await this.safeCall('ActivateIdentity', {
      image_base64: imageBase64,
      tenant_id: tenantId,
      person_ref: personRef,
      request_id: requestId || '',
    });

    return {
      identityId: data.identity_id,
    };
  }

  async compareIdWithFace({ idCardImageBase64, liveImageBase64, tenantId, requestId }) {
    const data = await this.safeCall('CompareIdWithFace', {
      id_card_image_base64: idCardImageBase64,
      live_image_base64: liveImageBase64,
      tenant_id: tenantId,
      request_id: requestId || '',
    });

    return {
      matched: Boolean(data.matched),
      score: Number(data.score || 0),
      livenessStatus: String(data.liveness_status || 'UNKNOWN'),
    };
  }
}
