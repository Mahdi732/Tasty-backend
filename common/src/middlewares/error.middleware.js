export const createErrorMiddleware = ({ logger, ApiError, fail, internalErrorCode }) => (err, req, res, _next) => {
  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;
  const code = isApiError ? err.code : internalErrorCode;
  const message = isApiError ? err.message : 'Internal server error';
  const userMessage = isApiError
    ? String(err.userMessage || err?.details?.userMessage || message)
    : 'Something went wrong. Please try again shortly.';

  logger.error({ err, requestId: req.requestId, path: req.path }, 'request_failed');

  return fail(
    res,
    statusCode,
    {
      code,
      message,
      userMessage,
      requestId: req.requestId,
      details: isApiError ? err.details : undefined,
    },
    isApiError ? err.meta : undefined
  );
};

