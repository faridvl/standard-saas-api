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

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as any).message
        : exception.message || 'Internal Server Error';

    // Log estandarizado y elegante
    const logInfo = {
      path: request.url,
      method: request.method,
      ip: request.ip,
    };

    if (status >= 500) {
      this.logger.error(`Critical Error: ${message}`, exception.stack, logInfo);
    } else {
      this.logger.warn(`Client Error: ${JSON.stringify(message)}`, logInfo);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message: message,
      timestamp: new Date().toISOString(),
    });
  }
}
