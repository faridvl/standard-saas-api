"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const app_logger_1 = require("../logger/app-logger");
let GlobalExceptionFilter = class GlobalExceptionFilter {
    constructor() {
        this.logger = new app_logger_1.AppLogger();
        this.logger.setContext('HttpTraffic');
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception instanceof common_1.HttpException ? exception.getStatus() : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const exceptionResponse = exception instanceof common_1.HttpException ? exception.getResponse() : null;
        const message = typeof exceptionResponse === 'object' && exceptionResponse !== null
            ? exceptionResponse.message || exception.message
            : exception.message || 'Internal Server Error';
        const details = typeof exceptionResponse === 'object' && exceptionResponse !== null
            ? exceptionResponse.details || null
            : null;
        const logInfo = {
            path: request.url,
            method: request.method,
            ip: request.ip,
            details,
        };
        if (status >= 500) {
            this.logger.error(`Critical Error: ${message}`, exception.stack, logInfo);
        }
        else {
            this.logger.warn(`Client Error: ${JSON.stringify(message)}`, logInfo);
        }
        response.status(status).json({
            success: false,
            statusCode: status,
            message: message,
            details: details,
            timestamp: new Date().toISOString(),
        });
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)(),
    __metadata("design:paramtypes", [])
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map