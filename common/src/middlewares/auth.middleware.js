export const createJwtAuthMiddleware = ({ verifyAccessToken, onAuthenticated }) => async (req, _res, next) => {
  try {
    const authHeader = req.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return next(new Error('AUTH_TOKEN_MISSING'));
    }

    const payload = await verifyAccessToken(token);
    const rawRoles = payload.roles || payload.role || [];
    const roles = Array.isArray(rawRoles) ? rawRoles : [rawRoles].filter(Boolean);

    req.auth = {
      userId: payload.sub,
      roles,
      sessionId: payload.sid || null,
      jti: payload.jti || null,
    };

    if (onAuthenticated) {
      await onAuthenticated(req, payload);
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const createApiKeyAuthMiddleware = ({ ApiError, unauthorizedCode, apiKey }) => (req, _res, next) => {
  const provided = req.get('x-api-key');
  if (!provided || provided !== apiKey) {
    return next(new ApiError(401, unauthorizedCode, 'Unauthorized service key'));
  }
  return next();
};
