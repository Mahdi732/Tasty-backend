export const requestTimeoutMiddleware = (timeoutMs) => (req, res, next) => {
  req.setTimeout(timeoutMs);
  res.setTimeout(timeoutMs);
  next();
};
