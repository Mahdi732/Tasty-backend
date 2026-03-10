import crypto from 'crypto';

export const createRequestIdMiddleware = () => (req, res, next) => {
  req.requestId = req.get('x-request-id') || crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
};

