import { Logger, Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT }) // Transient para que cada servicio tenga su propio contexto
export class AppLogger {
  private context: string = 'App';
  private readonly logger = new Logger();

  setContext(context: string): void {
    this.context = context;
  }

  log(message: string, data?: unknown): void {
    this.logger.log(`${message} ${data ? `| Data: ${JSON.stringify(data)}` : ''}`, this.context);
  }

  error(message: string, trace?: string, data?: unknown): void {
    this.logger.error(
      `${message} ${data ? `| Context Data: ${JSON.stringify(data)}` : ''}`,
      trace,
      this.context,
    );
  }

  warn(message: string, data?: unknown): void {
    this.logger.warn(
      `${message} ${data ? `| Warning Data: ${JSON.stringify(data)}` : ''}`,
      this.context,
    );
  }

  debug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `${message} ${data ? `| Debug Data: ${JSON.stringify(data)}` : ''}`,
        this.context,
      );
    }
  }
}
