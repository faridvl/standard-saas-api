import { z } from 'zod';

export const UpdateUserSchema = z.object({
  fullName: z.string().min(1, 'El nombre es obligatorio').optional(),
  phoneNumber: z.string().optional(),
  specialty: z.string().optional(),
  signatureUrl: z.string().url().optional().nullable(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
