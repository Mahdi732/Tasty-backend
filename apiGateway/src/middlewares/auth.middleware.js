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

const sendVerificationRequired = (res, message) => {
  res.status(403).json({
    success: false,
    error: {
      code: 'AUTH_VERIFICATION_REQUIRED',
      message,
    },
  });
};

export const requireFullyVerifiedAccount = (req, res, next) => {
  if (req.auth?.status !== 'ACTIVE') {
    sendVerificationRequired(res, 'Complete account verification before continuing');
    return;
  }

  if (req.auth?.verification?.email !== true || req.auth?.verification?.phone !== true || req.auth?.verification?.face !== true) {
    sendVerificationRequired(res, 'Email, phone, and face/card verification are required before continuing');
    return;
  }

  next();
};

// Backward-compatible alias used by existing route wiring.
export const requireActiveAndFaceVerified = requireFullyVerifiedAccount;
