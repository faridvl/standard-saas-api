import { z, ZodSchema } from 'zod';

export class SchemaValidator {
  /**
   * Valida datos contra un esquema de Zod
   * Si falla, lanza un error que nuestro GlobalFilter atrapará
   */
  static validate<T>(schema: ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);

    if (!result.success) {
      // Formateamos los errores de Zod para que sean legibles
      const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
      throw new Error(`VALIDATION_FAILED: ${issues.join(', ')}`);
    }

    return result.data;
  }
}
