import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    // Si el cliente no envía body, forzamos un objeto vacío para que Zod valide los campos faltantes
    const valueToValidate = value ?? {};

    const result = this.schema.safeParse(valueToValidate);

    if (!result.success) {
      const errorMessages = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));

      throw new BadRequestException({
        message: 'Validation failed',
        details: errorMessages,
      });
    }
    return result.data;
  }
}
