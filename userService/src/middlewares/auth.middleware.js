import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';
import { USER_STATUS } from '../constants/user-status.js';

const canAccessWhilePendingActivation = (method, path) => {
  if (method === 'POST' && path === '/activate-account') return true;
  if (method === 'GET' && path === '/profile') return true;
  return false;
};

export const authMiddleware = (jwtVerifier, userRepository) => async (req, _res, next) => {
  try {
    const authHeader = req.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      throw new ApiError(401, ERROR_CODES.AUTH_UNAUTHORIZED, 'Authentication required');
    }

    const payload = await jwtVerifier.verifyAccessToken(token);
    const rawRoles = payload.roles || payload.role || [];
    const roles = Array.isArray(rawRoles) ? rawRoles : [rawRoles].filter(Boolean);

    req.auth = {
      userId: payload.sub,
      roles,
      sessionId: payload.sid,
      jti: payload.jti,
    };

    const user = await userRepository.findById(payload.sub);
    if (!user) {
      throw new ApiError(401, ERROR_CODES.AUTH_UNAUTHORIZED, 'Authentication required');
    }

    req.auth.status = user.status;

    const requestPath = (req.originalUrl || req.path || '').split('?')[0];
    if (
      user.status === USER_STATUS.PENDING_FACE_ACTIVATION &&
      !canAccessWhilePendingActivation(req.method, requestPath)
    ) {
      throw new ApiError(
        403,
        ERROR_CODES.AUTH_FORBIDDEN,
        'Face activation is required before using this endpoint'
      );
    }

    if (![USER_STATUS.ACTIVE, USER_STATUS.PENDING_FACE_ACTIVATION].includes(user.status)) {
      throw new ApiError(403, ERROR_CODES.AUTH_FORBIDDEN, 'Account cannot access protected resources');
    }

    next();
  } catch (error) {
    next(error);
  }
};
