import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

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
const faceProto = proto.tasty.face.v1;

export const startGrpcServer = async ({ faceService, logger, port = 50054 }) => {
  const server = new grpc.Server();

  server.addService(faceProto.FaceService.service, {
    CompareIdWithFace: async (call, callback) => {
      try {
        const req = call.request;
        const result = await faceService.compareIdWithFace(
          {
            idCardImageBase64: req.id_card_image_base64,
            liveImageBase64: req.live_image_base64,
            tenantId: req.tenant_id || 'global',
          },
          {
            requestId: req.request_id || null,
          }
        );

        callback(null, {
          success: true,
          message: 'ok',
          matched: Boolean(result.matched),
          score: Number(result.score || 0),
          liveness_status: String(result.livenessStatus || 'UNKNOWN'),
        });
      } catch (error) {
        logger?.error({ err: error }, 'grpc_compare_id_with_face_failed');
        callback(null, { success: false, message: error.message || 'compare_id_with_face_failed' });
      }
    },

    ActivateIdentity: async (call, callback) => {
      try {
        const req = call.request;
        const result = await faceService.activate(
          {
            imageBase64: req.image_base64,
            tenantId: req.tenant_id || 'global',
            personRef: req.person_ref,
            listType: 'NORMAL',
            reason: 'grpc-activation',
          },
          { requestId: req.request_id || null }
        );

        callback(null, {
          success: true,
          message: 'ok',
          identity_id: result.identityId || '',
        });
      } catch (error) {
        logger?.error({ err: error }, 'grpc_activate_identity_failed');
        callback(null, { success: false, message: error.message || 'activate_identity_failed' });
      }
    },

    SearchWatchlists: async (call, callback) => {
      try {
        const req = call.request;
        const result = await faceService.search(
          {
            imageBase64: req.image_base64,
            tenantId: req.tenant_id || 'global',
            targetLists: ['BANNED', 'DEBTOR'],
            topK: 5,
            threshold: req.threshold || undefined,
          },
          { requestId: req.request_id || null }
        );

        callback(null, {
          success: true,
          message: 'ok',
          decision: result.decision || 'NO_MATCH',
          candidates: (result.candidates || []).map((candidate) => ({
            person_ref: candidate.personRef || '',
            list_type: candidate.listType || '',
            score: Number(candidate.score || 0),
          })),
        });
      } catch (error) {
        logger?.error({ err: error }, 'grpc_search_watchlists_failed');
        callback(null, { success: false, message: error.message || 'search_watchlists_failed' });
      }
    },

    BlacklistDebtor: async (call, callback) => {
      try {
        const req = call.request;
        const result = await faceService.blacklistByRef(
          {
            tenantId: req.tenant_id || 'global',
            personRef: req.person_ref,
            reason: req.reason || null,
          },
          { requestId: req.request_id || null }
        );

        callback(null, {
          success: true,
          message: 'ok',
          blacklisted: Boolean(result.blacklisted),
        });
      } catch (error) {
        logger?.error({ err: error }, 'grpc_blacklist_debtor_failed');
        callback(null, { success: false, message: error.message || 'blacklist_debtor_failed' });
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

  logger?.info({ grpcPort: port }, 'face_grpc_server_started');
  return server;
};
