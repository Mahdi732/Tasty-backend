import { importSPKI, jwtVerify } from 'jose';

const buildAuthFromPayload = (payload) => ({
  userId: payload.sub,
  roles: payload.roles || [],
  status: payload.status || null,
  verification: payload.verification || {},
});

export const createAuthMiddleware = ({ env }) => {
  let keyPromise = null;

  const getKey = async () => {
    if (!keyPromise) {
      keyPromise = importSPKI(env.JWT_PUBLIC_KEY, 'RS256');
    }
    return keyPromise;
  };

  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization || '';
      if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, error: { code: 'AUTH_UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const token = authHeader.slice('Bearer '.length).trim();
      const key = await getKey();
      const { payload } = await jwtVerify(token, key, {
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      });

      req.auth = buildAuthFromPayload(payload);
      next();
    } catch {
      res.status(401).json({ success: false, error: { code: 'AUTH_UNAUTHORIZED', message: 'Authentication required' } });
    }
  };
};

export const requireActiveAndFaceVerified = (req, res, next) => {
  if (req.auth?.status !== 'ACTIVE') {
    res.status(403).json({ success: false, error: { code: 'AUTH_FORBIDDEN', message: 'Account must be ACTIVE' } });
    return;
  }

  if (req.auth?.verification?.face !== true) {
    res.status(403).json({ success: false, error: { code: 'AUTH_FORBIDDEN', message: 'Face activation is required before ordering' } });
    return;
  }

  next();
};
