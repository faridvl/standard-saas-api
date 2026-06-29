import { z } from 'zod';

export const CreateMaintenanceSchema = z.object({
  patientUuid: z.string().uuid(),
  description: z.string().min(1, 'La descripción es obligatoria'),
  nextMaintenanceAt: z.string().datetime().optional().nullable(),
  deviceUuid: z.string().uuid().optional().nullable(),
});

export type CreateMaintenanceDto = z.infer<typeof CreateMaintenanceSchema>;
