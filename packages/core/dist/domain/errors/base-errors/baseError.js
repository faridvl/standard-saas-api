"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFoundError = exports.BaseError = void 0;
class BaseError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.code = code;
        Object.setPrototypeOf(this, BaseError.prototype);
    }
}
exports.BaseError = BaseError;
class NotFoundError extends BaseError {
    constructor(message = 'Resource not found', code = 'NOT_FOUND') {
        super(message, 404, code);
    }
}
exports.NotFoundError = NotFoundError;
//# sourceMappingURL=baseError.js.map