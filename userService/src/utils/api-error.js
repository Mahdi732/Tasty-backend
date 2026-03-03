export class ApiError extends Error {
  constructor(statusCode, code, message, details, meta) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.meta = meta;
  }
}
