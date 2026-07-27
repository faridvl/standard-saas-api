import { z } from 'zod';
import { StudyType } from '@medical-records/domain/types/study.types';

export const CreateStudySchema = z.object({
  encounterUuid: z.string().uuid(),
  patientUuid: z.string().uuid(),
  tipo: z.nativeEnum(StudyType),
  payload: z.record(z.string(), z.unknown()),
  documentUuid: z.string().uuid().optional().nullable(),
});

export type CreateStudyDto = z.infer<typeof CreateStudySchema>;
