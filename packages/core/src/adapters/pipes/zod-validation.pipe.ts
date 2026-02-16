import { PipeTransform, BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') {
      return value;
    }

    const valueToValidate = value ?? {};
    const result = this.schema.safeParse(valueToValidate);

    if (!result.success) {
      const errorMessages = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));

      throw new BadRequestException({
        success: false,
        statusCode: 400,
        message: 'Validation failed',
        details: errorMessages,
      });
    }

    return result.data;
  }
}
