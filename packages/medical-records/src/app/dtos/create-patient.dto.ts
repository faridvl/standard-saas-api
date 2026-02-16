import { z } from 'zod';

export const CreatePatientSchema = z.object({
  firstName: z.string().min(2, 'El nombre es muy corto'),
  lastName: z.string().min(2, 'El apellido es muy corto'),
  phone: z.string().optional(),
  birthDate: z.string().transform((str) => new Date(str)), // Convierte string ISO a Date
  address: z.string().optional(),
});

export type CreatePatientDto = z.infer<typeof CreatePatientSchema>;
