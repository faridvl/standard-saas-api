import { z } from 'zod';

export const CreatePatientDeviceSchema = z.object({
  productUnitUuid: z.string().uuid('UUID de unidad inválido'),
  side: z.enum(['OD', 'OI', 'AMBOS']),
  notes: z.string().optional(),
});

export type CreatePatientDeviceDto = z.infer<typeof CreatePatientDeviceSchema>;
