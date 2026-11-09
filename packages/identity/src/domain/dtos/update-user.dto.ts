import { z } from 'zod';
import { ASSIGNABLE_USER_ROLES } from '../types/user.types';

export const UpdateUserSchema = z.object({
  fullName: z.string().min(1, 'El nombre es obligatorio').optional(),
  phoneNumber: z.string().optional(),
  specialty: z.string().optional(),
  role: z.enum(ASSIGNABLE_USER_ROLES).optional(),
  signatureUrl: z.string().url().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
