import { z } from 'zod';
import { PatientStatus } from '@medical-records/domain/types/patient-status.types';

export const UpdatePatientStatusSchema = z.object({
  status: z.nativeEnum(PatientStatus),
  // Motivo libre (p. ej. "se mudó"). Se guarda solo si el estado no es activo.
  reason: z.string().trim().max(200, 'Máximo 200 caracteres').optional().nullable(),
  // Fecha de fallecimiento (YYYY-MM-DD), opcional. Solo aplica a DECEASED.
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Fecha inválida (YYYY-MM-DD)' })
    .optional()
    .nullable(),
});

export type UpdatePatientStatusDto = z.infer<typeof UpdatePatientStatusSchema>;
