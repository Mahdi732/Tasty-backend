export const errorHandler = (err, req, res, next) => {
  const status = Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const isServerError = status >= 500;

  if (isServerError) {
    const log = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${err.stack || err.message}\n`;
    process.stderr.write(log);
  }

  const body = {
    message: isServerError ? "Internal Server Error" : err.message || "Error"
  };

  if (!isServerError && err.code) body.code = err.code;
  if (!isServerError && err.errors) body.errors = err.errors;

  res.status(status).json(body);
};
