export abstract class BaseError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code?: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, BaseError.prototype);
  }
}

export class NotFoundError extends BaseError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}
