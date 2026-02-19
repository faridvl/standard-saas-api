export declare abstract class BaseError extends Error {
    readonly message: string;
    readonly statusCode: number;
    readonly code?: string | undefined;
    constructor(message: string, statusCode: number, code?: string | undefined);
}
export declare class NotFoundError extends BaseError {
    constructor(message?: string, code?: string);
}
