export const requestTimeoutMiddleware = (timeoutMs) => (_req, res, next) => {
  res.setTimeout(timeoutMs);
  next();
};
