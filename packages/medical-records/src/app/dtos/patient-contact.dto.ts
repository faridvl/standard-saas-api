import { z } from 'zod';

export const CreatePatientContactSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(80),
  phone: z.string().min(1, 'El teléfono es obligatorio').max(20),
});

export type CreatePatientContactDto = z.infer<typeof CreatePatientContactSchema>;
