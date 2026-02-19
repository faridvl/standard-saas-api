export declare class AppLogger {
    private context;
    private readonly logger;
    setContext(context: string): void;
    log(message: string, data?: any): void;
    error(message: string, trace?: string, data?: any): void;
    warn(message: string, data?: any): void;
    debug(message: string, data?: any): void;
}
