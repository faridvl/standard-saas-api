import { z } from 'zod';

export const UpdatePatientSchema = z.object({
  firstName: z.string().min(2, 'El nombre es muy corto').optional(),
  lastName: z.string().min(2, 'El apellido es muy corto').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email().optional(),
  gender: z.string().optional(),
  bloodType: z.string().optional(),
  linkedProductUuid: z.string().uuid().nullable().optional(),
});

export type UpdatePatientDto = z.infer<typeof UpdatePatientSchema>;
