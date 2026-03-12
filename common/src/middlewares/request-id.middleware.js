import crypto from 'crypto';
import { runWithRequestContext } from '../tracing/context.js';

export const createRequestIdMiddleware = () => (req, res, next) => {
  const correlationId = req.get('x-request-id') || req.get('x-correlation-id') || crypto.randomUUID();
  req.requestId = correlationId;
  req.correlationId = correlationId;
  res.setHeader('x-request-id', req.requestId);
  res.setHeader('x-correlation-id', req.correlationId);

  runWithRequestContext(
    {
      requestId: req.requestId,
      correlationId: req.correlationId,
    },
    () => next()
  );
};

