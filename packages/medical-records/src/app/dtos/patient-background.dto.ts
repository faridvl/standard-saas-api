import { z } from 'zod';
import { ClinicalFieldDefinitionSchema } from './clinical-template.dto';

const TINNITUS_TONE_MAX_LENGTH = 120;
const OTOSCOPY_MAX_LENGTH = 1000;
const ANSWER_TEXT_MAX_LENGTH = 1000;
export const ANSWER_ID_MAX_LENGTH = 60;
const SNAPSHOT_MAX_FIELDS = 100;

/** Sí/No, Sí/No con detalle o texto, según el tipo de la pregunta. */
export const AnswerSchema = z.union([
  z.boolean(),
  z.string().max(ANSWER_TEXT_MAX_LENGTH),
  z.object({
    value: z.boolean(),
    detail: z.string().max(ANSWER_TEXT_MAX_LENGTH).nullable().optional(),
  }),
]);

/**
 * Texto libre opcional: se recorta y "" (o solo espacios) se guarda como null.
 * Si no viene (undefined) se deja como está: otros clientes no mandan todos los campos.
 */
const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, `Máximo ${maxLength} caracteres`)
    .optional()
    .nullable()
    .transform((value) => (value === undefined ? undefined : value ? value : null));

export const UpsertPatientBackgroundSchema = z.object({
  earInfections: z.boolean().optional(),
  nasalSurgery: z.boolean().optional(),
  throatSurgery: z.boolean().optional(),
  earSurgery: z.boolean().optional(),
  diabetes: z.boolean().optional(),
  cholesterol: z.boolean().optional(),
  highPressure: z.boolean().optional(),
  allergies: z.boolean().optional(),
  rhinitis: z.boolean().optional(),
  vertigo: z.boolean().optional(),
  tinnitus: z.boolean().optional(),
  headacheNoise: z.boolean().optional(),
  cloggedEar: z.boolean().optional(),
  dizziness: z.boolean().optional(),
  tinnitusTone: optionalText(TINNITUS_TONE_MAX_LENGTH),
  otoscopyRight: optionalText(OTOSCOPY_MAX_LENGTH),
  otoscopyLeft: optionalText(OTOSCOPY_MAX_LENGTH),
  notes: z.string().optional().nullable(),
  answers: z.record(z.string().max(ANSWER_ID_MAX_LENGTH), AnswerSchema).optional().nullable(),
  templateSnapshot: z
    .array(ClinicalFieldDefinitionSchema)
    .max(SNAPSHOT_MAX_FIELDS)
    .optional()
    .nullable(),
});

export type UpsertPatientBackgroundDto = z.infer<typeof UpsertPatientBackgroundSchema>;
