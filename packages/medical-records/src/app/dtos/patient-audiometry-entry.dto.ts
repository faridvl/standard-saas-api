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
/** Palabras por oído de cada tipo de lista: 10 de Tato (bisílabos) y 25 de Rosenblüt (monosílabos). */
const PRESENTED_WORDS_BY_LIST_TYPE = { BISYLLABLE: 10, MONOSYLLABLE: 25 } as const;
const PRESENTED_WORDS_MAX = PRESENTED_WORDS_BY_LIST_TYPE.MONOSYLLABLE;

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

/** Herramientas que admiten la versión enmascarada del símbolo. */
const MASKABLE_TOOLS = ['AIR', 'BONE'] as const;

/** Grados que existen en cada escala: ASHA no tiene cofosis y BIAP solo usa los grados principales. */
const GRADES_BY_SCALE: Record<
  z.infer<typeof GradingScaleSchema>,
  readonly z.infer<typeof HearingGradeSchema>[]
> = {
  ASHA: ['NORMAL', 'SLIGHT', 'MILD', 'MODERATE', 'MODERATELY_SEVERE', 'SEVERE', 'PROFOUND'],
  BIAP: ['NORMAL', 'MILD', 'MODERATE', 'SEVERE', 'PROFOUND', 'TOTAL_LOSS'],
};

const ear = <T extends z.ZodType>(schema: T) => z.strictObject({ RIGHT: schema, LEFT: schema });

const ToneMarkSchema = z.object({
  thresholdDb: z.number().int().min(MIN_DB_HL).max(MAX_DB_HL),
  isMasked: z.boolean(),
  hasNoResponse: z.boolean(),
});

const ToneMarksByEarSchema = ear(z.partialRecord(z.enum(TONAL_FREQUENCIES_HZ), ToneMarkSchema));

/** Sin ceros a la izquierda: "5" y "05" serían dos claves para la misma intensidad. */
const INTENSITY_KEY_PATTERN = /^(0|[1-9]\d{0,2})$/;

/** El front marca la logoaudiometría y reporta el PTA en pasos de 5 dB. */
const DB_REPORT_STEP = 5;

const SpeechIntensityKey = z.string().refine((key) => {
  const intensity = Number(key);
  return (
    INTENSITY_KEY_PATTERN.test(key) &&
    intensity >= SPEECH_MIN_DB &&
    intensity <= SPEECH_MAX_DB &&
    intensity % DB_REPORT_STEP === 0
  );
}, `La intensidad va de ${SPEECH_MIN_DB} a ${SPEECH_MAX_DB} dB, en pasos de ${DB_REPORT_STEP}`);

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
    marks: z.strictObject({
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
    const expectedWords =
      wordListType === null ? null : PRESENTED_WORDS_BY_LIST_TYPE[wordListType];
    const presentedMatches =
      expectedWords === null
        ? Object.values(PRESENTED_WORDS_BY_LIST_TYPE).some((count) => count === presentedWords)
        : expectedWords === presentedWords;
    if (!presentedMatches) {
      context.addIssue({
        code: 'custom',
        path: ['speech', 'presentedWords'],
        message: 'Las palabras presentadas no corresponden al tipo de lista',
      });
    }

    (Object.keys(payload.marks) as (keyof typeof payload.marks)[]).forEach((tool) => {
      if ((MASKABLE_TOOLS as readonly string[]).includes(tool)) return;
      (['RIGHT', 'LEFT'] as const).forEach((side) => {
        Object.entries(payload.marks[tool][side]).forEach(([frequency, mark]) => {
          if (mark?.isMasked) {
            context.addIssue({
              code: 'custom',
              path: ['marks', tool, side, frequency, 'isMasked'],
              message: 'Esta herramienta no admite enmascaramiento',
            });
          }
        });
      });
    });

    (['RIGHT', 'LEFT'] as const).forEach((side) => {
      const { pta, grade, failedWords: failed } = payload.summary.ears[side];
      if (pta !== null && pta % DB_REPORT_STEP !== 0) {
        context.addIssue({
          code: 'custom',
          path: ['summary', 'ears', side, 'pta'],
          message: `El PTA va en pasos de ${DB_REPORT_STEP} dB`,
        });
      }
      if (grade !== null && !GRADES_BY_SCALE[payload.summary.gradingScale].includes(grade)) {
        context.addIssue({
          code: 'custom',
          path: ['summary', 'ears', side, 'grade'],
          message: 'El grado no existe en la escala elegida',
        });
      }
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
