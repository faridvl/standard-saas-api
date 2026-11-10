import { z } from 'zod';
import { ASSIGNABLE_USER_ROLES, UserRole } from '../types/user.types';
import { passwordSchema } from '../validations/password.schema';
import {
  acceptLegacySpecialty,
  ATTENDS_PATIENTS_NEEDS_SPECIALTY_MESSAGE,
  specialtiesSchema,
} from '../validations/professional.schema';

export const CreateUserSchema = z.preprocess(
  acceptLegacySpecialty,
  z
    .object({
      email: z.string().trim().toLowerCase().email('Email inválido'),
      fullName: z.string().min(1, 'El nombre es obligatorio'),
      password: passwordSchema,
      role: z.enum(ASSIGNABLE_USER_ROLES).default(UserRole.RECEPTION),
      attendsPatients: z.boolean().default(false),
      specialties: specialtiesSchema.default([]),
      phoneNumber: z.string().optional(),
    })
    .refine((data) => !data.attendsPatients || data.specialties.length > 0, {
      message: ATTENDS_PATIENTS_NEEDS_SPECIALTY_MESSAGE,
      path: ['specialties'],
    }),
);

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
