import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express'; // Ahora esto ya no debería marcar error
import { ApiErrorCode } from './error-codes';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Si es un error de NestJS (como un 404 o 400), sacamos su status,
    // si no, es un error 500 (nuestro)
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof Error ? exception.message : 'INTERNAL_SERVER_ERROR';

    // Estructura de respuesta única para todo tu SaaS
    response.status(status).json({
      success: false,
      error: {
        code: exception.response?.code || ApiErrorCode.INTERNAL_ERROR,
        message: message,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
