import { z } from 'zod';

export const CreatePatientDeviceSchema = z.object({
  side: z.enum(['OD', 'OI', 'AMBOS']),
  productUuid: z.string().uuid().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  warrantyUntil: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export type CreatePatientDeviceDto = z.infer<typeof CreatePatientDeviceSchema>;
