import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware = (req, res, next) => {
  const requestId = req.get('x-request-id') || uuidv4();
  req.requestId = requestId;
  res.set('x-request-id', requestId);
  next();
};
