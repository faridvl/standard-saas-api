import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AppLogger } from '../logger/app-logger';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new AppLogger();

  constructor() {
    this.logger.setContext('HttpTraffic');
  }

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // 1. Extraemos la respuesta completa de la excepción
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    // 2. Buscamos el mensaje y los detalles (si existen)
    // NestJS a veces pone el mensaje en .message, Zod lo pusimos en .message también.
    const message =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).message || exception.message
        : exception.message || 'Internal Server Error';

    const details =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).details || null // <--- AQUÍ CAPTURAMOS TUS DETALLES DE ZOD
        : null;

    const logInfo = {
      path: request.url,
      method: request.method,
      ip: request.ip,
      details, // Agregamos los detalles al log para debuguear mejor
    };

    if (status >= 500) {
      this.logger.error(`Critical Error: ${message}`, exception.stack, logInfo);
    } else {
      this.logger.warn(`Client Error: ${JSON.stringify(message)}`, logInfo);
    }

    // 3. Enviamos la respuesta incluyendo los 'details'
    response.status(status).json({
      success: false,
      statusCode: status,
      message: message,
      details: details, // <--- AHORA SÍ SALDRÁ EN POSTMAN
      timestamp: new Date().toISOString(),
    });
  }
}
