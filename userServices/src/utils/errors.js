export class AppError extends Error {
  constructor(message, statusCode = 500, code = "ERROR", errors = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}
