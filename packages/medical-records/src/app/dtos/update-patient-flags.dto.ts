import { z } from 'zod';

export const UpdatePatientFlagsSchema = z
  .object({
    hearingAidsInLab: z.boolean().optional(),
    hasActiveWarranty: z.boolean().optional(),
    isVideoCandidate: z.boolean().optional(),
  })
  .refine((dto) => Object.values(dto).some((value) => value !== undefined), {
    message: 'Indica al menos un indicador',
  });

export type UpdatePatientFlagsDto = z.infer<typeof UpdatePatientFlagsSchema>;
