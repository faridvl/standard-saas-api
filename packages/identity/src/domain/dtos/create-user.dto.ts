import { z } from 'zod';
import { ASSIGNABLE_USER_ROLES, UserRole } from '../types/user.types';
import { passwordSchema } from '../validations/password.schema';

export const CreateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  fullName: z.string().min(1, 'El nombre es obligatorio'),
  password: passwordSchema,
  role: z.enum(ASSIGNABLE_USER_ROLES).default(UserRole.ADMIN),
  specialty: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
