import grpc from '@grpc/grpc-js';
import { runWithRequestContext } from '../tracing/context.js';

const META_KEYS = {
  internalSecret: 'x-internal-service-secret',
  userId: 'x-user-id',
  userStatus: 'x-user-status',
  userRoles: 'x-user-roles',
  requestId: 'x-request-id',
  correlationId: 'x-correlation-id',
};

const getMetadataValue = (metadata, key) => {
  const values = metadata.get(key);
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  const value = values[0];
  return value == null ? null : String(value);
};

const parseRoles = (rolesRaw) => {
  if (!rolesRaw) return [];
  try {
    const parsed = JSON.parse(rolesRaw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return rolesRaw.split(',').map((role) => role.trim()).filter(Boolean);
  }
};

const toGrpcError = (code, details) => ({ code, details });

export const createInternalAuthInterceptor = ({ internalServiceSecret, logger } = {}) => {
  if (!internalServiceSecret) {
    throw new Error('INTERNAL_SERVICE_SECRET is required for gRPC internal auth interceptor');
  }

  const authenticateCall = ({ call, requireUser = false }) => {
    const providedSecret = getMetadataValue(call.metadata, META_KEYS.internalSecret);
    if (!providedSecret || providedSecret !== internalServiceSecret) {
      logger?.warn?.({ method: call.getPath?.() }, 'grpc_internal_auth_failed');
      throw toGrpcError(grpc.status.UNAUTHENTICATED, 'Invalid internal service secret');
    }

    const requestContext = {
      userId: getMetadataValue(call.metadata, META_KEYS.userId),
      status: getMetadataValue(call.metadata, META_KEYS.userStatus),
      roles: parseRoles(getMetadataValue(call.metadata, META_KEYS.userRoles)),
      requestId: getMetadataValue(call.metadata, META_KEYS.requestId),
      correlationId:
        getMetadataValue(call.metadata, META_KEYS.correlationId)
        || getMetadataValue(call.metadata, META_KEYS.requestId),
    };

    if (requireUser && !requestContext.userId) {
      throw toGrpcError(grpc.status.PERMISSION_DENIED, 'Authenticated user context is required');
    }

    call.requestContext = requestContext;
    return requestContext;
  };

  const withInternalAuth = (handler, options = {}) => async (call, callback) => {
    try {
      const context = authenticateCall({
        call,
        requireUser: Boolean(options.requireUser),
      });
      await runWithRequestContext(context, () => handler(call, callback, context));
    } catch (error) {
      if (error?.code != null && error?.details) {
        callback(error);
        return;
      }
      callback({
        code: grpc.status.INTERNAL,
        details: error?.message || 'internal_interceptor_failure',
      });
    }
  };

  return {
    withInternalAuth,
  };
};

export const INTERNAL_AUTH_METADATA_KEYS = META_KEYS;
