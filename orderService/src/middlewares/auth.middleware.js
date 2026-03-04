import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export const authMiddleware = (jwtVerifier) => async (req, _res, next) => {
  try {
    const authHeader = req.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) throw new ApiError(401, ERROR_CODES.AUTH_UNAUTHORIZED, 'Authentication required');

    const payload = await jwtVerifier.verifyAccessToken(token);
    const rawRoles = payload.roles || payload.role || [];
    const roles = Array.isArray(rawRoles) ? rawRoles : [rawRoles].filter(Boolean);

    req.auth = {
      userId: payload.sub,
      roles,
      sessionId: payload.sid || null,
      jti: payload.jti || null,
    };
    next();
  } catch (error) {
    next(error);
  }
};
