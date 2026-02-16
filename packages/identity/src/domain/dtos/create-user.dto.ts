// packages/identity/src/domain/validations/user.schema.ts
import { z } from 'zod';
import { UserRole } from '../types/user.types';

export const CreateUserSchema = z.object({
  email: z.string().email('Email inválido'),
  fullName: z.string().min(1, 'El nombre es obligatorio'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe tener una mayúscula')
    .regex(/[0-9]/, 'Debe tener un número'),
  role: z.nativeEnum(UserRole).default(UserRole.ADMIN),
  specialty: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
