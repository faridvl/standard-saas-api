import { z } from 'zod';

export const UpdatePatientFlagsSchema = z
  .object({
    hearingAidsInLab: z.boolean().optional(),
    hasActiveWarranty: z.boolean().optional(),
  })
  .refine((dto) => dto.hearingAidsInLab !== undefined || dto.hasActiveWarranty !== undefined, {
    message: 'Indica al menos un indicador',
  });

export type UpdatePatientFlagsDto = z.infer<typeof UpdatePatientFlagsSchema>;
