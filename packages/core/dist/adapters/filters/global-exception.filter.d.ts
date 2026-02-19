import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
export declare class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger;
    constructor();
    catch(exception: any, host: ArgumentsHost): void;
}
