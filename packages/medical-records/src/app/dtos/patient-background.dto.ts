import { z } from 'zod';

const TINNITUS_TONE_MAX_LENGTH = 120;
const OTOSCOPY_MAX_LENGTH = 1000;

/** Texto libre opcional: se recorta y "" (o solo espacios) se guarda como null. */
const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, `Máximo ${maxLength} caracteres`)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

export const UpsertPatientBackgroundSchema = z.object({
  earInfections: z.boolean().default(false),
  nasalSurgery: z.boolean().default(false),
  throatSurgery: z.boolean().default(false),
  earSurgery: z.boolean().default(false),
  diabetes: z.boolean().default(false),
  cholesterol: z.boolean().default(false),
  highPressure: z.boolean().default(false),
  allergies: z.boolean().default(false),
  rhinitis: z.boolean().default(false),
  vertigo: z.boolean().default(false),
  tinnitus: z.boolean().default(false),
  headacheNoise: z.boolean().default(false),
  cloggedEar: z.boolean().default(false),
  dizziness: z.boolean().default(false),
  tinnitusTone: optionalText(TINNITUS_TONE_MAX_LENGTH),
  otoscopyRight: optionalText(OTOSCOPY_MAX_LENGTH),
  otoscopyLeft: optionalText(OTOSCOPY_MAX_LENGTH),
  notes: z.string().optional().nullable(),
});

export type UpsertPatientBackgroundDto = z.infer<typeof UpsertPatientBackgroundSchema>;
