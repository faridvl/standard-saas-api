import { z } from 'zod';

const OTOSCOPY_MAX_LENGTH = 1000;

/** Se recorta y "" (o solo espacios) se guarda como null; si no viene, no se toca. */
const otoscopyText = z
  .string()
  .trim()
  .max(OTOSCOPY_MAX_LENGTH, `Máximo ${OTOSCOPY_MAX_LENGTH} caracteres`)
  .optional()
  .nullable()
  .transform((value) => (value === undefined ? undefined : value ? value : null));

export const UpsertPatientPhysicalExamSchema = z.object({
  otoscopyRight: otoscopyText,
  otoscopyLeft: otoscopyText,
});

export type UpsertPatientPhysicalExamDto = z.infer<typeof UpsertPatientPhysicalExamSchema>;
