export class ApiError extends Error {
  constructor(statusCode, code, message, details, meta, userMessage) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.meta = meta;
    this.userMessage = userMessage || null;
  }
}

