export const createValidateMiddleware = ({ ApiError, validationErrorCode }) => (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source] || {});
  if (!result.success) {
    return next(new ApiError(400, validationErrorCode, 'Validation error', result.error.flatten()));
  }
  req[source] = result.data;
  return next();
};
