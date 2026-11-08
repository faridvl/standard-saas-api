import { z } from 'zod';

/**
 * Las claves de los enums y de los mapas son las del front (audiometry-constants.ts y
 * speech-word-lists.ts): el estado del acordeón se manda casi tal cual.
 */
export const AUDIOMETRY_SCHEMA_VERSION = 1;

const AUDIOMETRY_NOTES_MAX_LENGTH = 1000;
const MIN_DB_HL = -10;
const MAX_DB_HL = 120;
const SPEECH_MIN_DB = 0;
const SPEECH_MAX_DB = 100;
const PERCENT_MIN = 0;
const PERCENT_MAX = 100;
const FAILED_WORDS_MIN = 0;
/** La lista más larga (monosílabos de Rosenblüt) presenta 25 palabras por oído. */
const PRESENTED_WORDS_MAX = 25;

const TONAL_FREQUENCIES_HZ = [
  '125',
  '250',
  '500',
  '1000',
  '1500',
  '2000',
  '3000',
  '4000',
  '6000',
  '8000',
] as const;
const WEBER_FREQUENCIES_HZ = ['500', '1000', '2000', '4000'] as const;

export const AudiometryEarSchema = z.enum(['RIGHT', 'LEFT']);
export const AudiometryToolSchema = z.enum(['AIR', 'BONE', 'UCL', 'MCL', 'FREE_FIELD']);
export const WeberResultSchema = z.enum(['CENTER', 'RIGHT', 'LEFT']);
export const PtaTypeSchema = z.enum(['PTA_512', 'PTA_5124', 'PTA_124', 'PTA_251']);
export const GradingScaleSchema = z.enum(['ASHA', 'BIAP']);
export const HearingGradeSchema = z.enum([
  'NORMAL',
  'SLIGHT',
  'MILD',
  'MODERATE',
  'MODERATELY_SEVERE',
  'SEVERE',
  'PROFOUND',
  'TOTAL_LOSS',
]);
export const WordListTypeSchema = z.enum(['BISYLLABLE', 'MONOSYLLABLE']);

/** Cada tipo de lista acepta solo sus propios ids. */
const WORD_LIST_IDS_BY_TYPE: Record<z.infer<typeof WordListTypeSchema>, readonly string[]> = {
  BISYLLABLE: ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4'],
  MONOSYLLABLE: ['A', 'B', 'C'],
};

const ear = <T extends z.ZodType>(schema: T) => z.strictObject({ RIGHT: schema, LEFT: schema });

const ToneMarkSchema = z.object({
  thresholdDb: z.number().int().min(MIN_DB_HL).max(MAX_DB_HL),
  isMasked: z.boolean(),
  hasNoResponse: z.boolean(),
});

const ToneMarksByEarSchema = ear(z.partialRecord(z.enum(TONAL_FREQUENCIES_HZ), ToneMarkSchema));

const SpeechIntensityKey = z.string().refine((key) => {
  const intensity = Number(key);
  return /^\d{1,3}$/.test(key) && intensity >= SPEECH_MIN_DB && intensity <= SPEECH_MAX_DB;
}, `La intensidad va de ${SPEECH_MIN_DB} a ${SPEECH_MAX_DB} dB`);

const percent = z.number().int().min(PERCENT_MIN).max(PERCENT_MAX);

const notesText = z
  .string()
  .trim()
  .max(AUDIOMETRY_NOTES_MAX_LENGTH, `Máximo ${AUDIOMETRY_NOTES_MAX_LENGTH} caracteres`)
  .default('');

const EarSummarySchema = z.object({
  /** PTA de vía aérea del método elegido; null si falta una frecuencia. */
  pta: z.number().min(MIN_DB_HL).max(MAX_DB_HL).nullable(),
  grade: HearingGradeSchema.nullable(),
  speechThresholdDb: z.number().int().min(MIN_DB_HL).max(MAX_DB_HL).nullable(),
  maxDiscriminationPercent: percent.nullable(),
  failedWords: z.number().int().min(FAILED_WORDS_MIN).nullable(),
});

export const AudiometryPayloadV1Schema = z
  .object({
    marks: z.object({
      AIR: ToneMarksByEarSchema,
      BONE: ToneMarksByEarSchema,
      UCL: ToneMarksByEarSchema,
      MCL: ToneMarksByEarSchema,
      FREE_FIELD: ToneMarksByEarSchema,
    }),
    weber: z.partialRecord(z.enum(WEBER_FREQUENCIES_HZ), WeberResultSchema).default({}),
    speech: z.object({
      marks: ear(z.record(SpeechIntensityKey, percent)),
      /** Null cuando el panel de palabras estaba oculto. */
      wordListType: WordListTypeSchema.nullable(),
      wordListId: z.string().nullable(),
      /** Palabras presentadas por oído: tope de las falladas. */
      presentedWords: z.number().int().min(1).max(PRESENTED_WORDS_MAX),
    }),
    summary: z.object({
      ptaType: PtaTypeSchema,
      gradingScale: GradingScaleSchema,
      ears: ear(EarSummarySchema),
    }),
    notes: z.object({ diagnosis: notesText, observations: notesText }),
  })
  .superRefine((payload, context) => {
    const { wordListType, wordListId, presentedWords } = payload.speech;
    if (
      wordListId !== null &&
      (wordListType === null || !WORD_LIST_IDS_BY_TYPE[wordListType].includes(wordListId))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['speech', 'wordListId'],
        message: 'La lista de palabras no corresponde al tipo elegido',
      });
    }
    (['RIGHT', 'LEFT'] as const).forEach((side) => {
      const failed = payload.summary.ears[side].failedWords;
      if (failed !== null && failed > presentedWords) {
        context.addIssue({
          code: 'custom',
          path: ['summary', 'ears', side, 'failedWords'],
          message: 'Las palabras falladas no pueden superar las presentadas',
        });
      }
    });
  });

export const CreatePatientAudiometryEntrySchema = z.object({
  schemaVersion: z.literal(AUDIOMETRY_SCHEMA_VERSION),
  payload: AudiometryPayloadV1Schema,
});

export type AudiometryPayloadV1 = z.infer<typeof AudiometryPayloadV1Schema>;
export type CreatePatientAudiometryEntryDto = z.infer<typeof CreatePatientAudiometryEntrySchema>;
