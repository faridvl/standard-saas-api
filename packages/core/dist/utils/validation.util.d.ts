import { ZodSchema } from 'zod';
export declare class SchemaValidator {
    static validate<T>(schema: ZodSchema<T>, data: unknown): T;
}
