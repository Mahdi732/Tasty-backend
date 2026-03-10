import { v4 as uuidv4 } from 'uuid';

export const createRequestIdMiddleware = () => (req, res, next) => {
  req.requestId = req.get('x-request-id') || uuidv4();
  res.setHeader('x-request-id', req.requestId);
  next();
};
