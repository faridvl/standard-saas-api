import { z } from 'zod';

const OTOSCOPY_MAX_LENGTH = 1000;

/** Se recorta y "" (o solo espacios) se guarda como null; si no viene, es undefined. */
const otoscopyText = z
  .string()
  .trim()
  .max(OTOSCOPY_MAX_LENGTH, `Máximo ${OTOSCOPY_MAX_LENGTH} caracteres`)
  .optional()
  .nullable()
  .transform((value) => (value === undefined ? undefined : value ? value : null));

const OtoscopyEntryFieldsSchema = z.object({
  otoscopyRight: otoscopyText,
  otoscopyLeft: otoscopyText,
});

/** Un registro vacío no aporta nada: al menos un oído con texto. */
const hasSomeText = (value: { otoscopyRight?: string | null; otoscopyLeft?: string | null }) =>
  Boolean(value.otoscopyRight) || Boolean(value.otoscopyLeft);

export const CreatePatientOtoscopyEntrySchema = OtoscopyEntryFieldsSchema.refine(hasSomeText, {
  message: 'Escribe la otoscopia de al menos un oído',
});

/** Un oído que no viene conserva su texto; null o "" lo limpia. */
export const UpdatePatientOtoscopyEntrySchema = OtoscopyEntryFieldsSchema;

export type CreatePatientOtoscopyEntryDto = z.infer<typeof CreatePatientOtoscopyEntrySchema>;
export type UpdatePatientOtoscopyEntryDto = z.infer<typeof UpdatePatientOtoscopyEntrySchema>;
