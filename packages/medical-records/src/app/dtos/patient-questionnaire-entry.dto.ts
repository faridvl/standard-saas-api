import { z } from 'zod';
import { AnswerSchema, ANSWER_ID_MAX_LENGTH } from './patient-background.dto';

export const CreatePatientQuestionnaireEntrySchema = z.object({
  templateUuid: z.string().uuid('La sección no es válida'),
  answers: z.record(z.string().max(ANSWER_ID_MAX_LENGTH), AnswerSchema),
});

export const FindPatientQuestionnaireEntriesQuerySchema = z.object({
  templateUuid: z.string().uuid('La sección no es válida').optional(),
});

export type CreatePatientQuestionnaireEntryDto = z.infer<
  typeof CreatePatientQuestionnaireEntrySchema
>;
export type FindPatientQuestionnaireEntriesQuery = z.infer<
  typeof FindPatientQuestionnaireEntriesQuerySchema
>;
