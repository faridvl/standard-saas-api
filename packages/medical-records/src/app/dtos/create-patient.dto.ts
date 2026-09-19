import { z } from 'zod';

const CreatePatientContactSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(80),
  phone: z.string().min(1, 'El teléfono es obligatorio').max(20),
});

export const CreatePatientSchema = z.object({
  firstName: z.string().min(2, 'El nombre es muy corto'),
  lastName: z.string().min(2, 'El apellido es muy corto'),
  phone: z.string().optional(),
  birthDate: z.string().transform((str) => new Date(str)),
  address: z.string().optional(),
  email: z.literal('').optional().or(z.string().email()),
  gender: z.string().optional(),
  bloodType: z.string().optional(),
  documentId: z.string().optional(),
  branchUuid: z.string().uuid().optional(),
  contacts: z.array(CreatePatientContactSchema).optional(),
});

export type CreatePatientDto = z.infer<typeof CreatePatientSchema>;
