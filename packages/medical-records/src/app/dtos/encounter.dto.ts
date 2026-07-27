import { z } from 'zod';

export const CreateEncounterSchema = z.object({
  patientUuid: z.string().uuid(),
  especialidad: z.string().min(1, 'La especialidad es obligatoria'),
  appointmentUuid: z.string().uuid().optional().nullable(),
});

export type CreateEncounterDto = z.infer<typeof CreateEncounterSchema>;
