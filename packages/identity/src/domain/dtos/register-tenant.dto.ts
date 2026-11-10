import { z } from 'zod';
import { acceptLegacySpecialty, specialtiesSchema } from '../validations/professional.schema';

export const BusinessTypeValues = ['AUDIOLOGY', 'DENTAL', 'GENERAL', 'OTHER'] as const;
export type BusinessType = (typeof BusinessTypeValues)[number];

export const RegisterTenantSchema = z.preprocess(
  acceptLegacySpecialty,
  z
    .object({
      businessName: z.string().min(1, 'El nombre de la empresa es obligatorio'),
      businessType: z.enum(BusinessTypeValues).default('GENERAL'),
      ownerName: z.string().min(1, 'El nombre del dueño es obligatorio'),
      phone: z.string().optional(),
      email: z.string().trim().toLowerCase().email('Formato de email inválido'),
      password: z
        .string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
        .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
      isSpecialist: z.boolean().default(false),
      specialties: specialtiesSchema.default([]),
    })
    .refine((data) => !data.isSpecialist || data.specialties.length > 0, {
      message: 'La especialidad es obligatoria si eres especialista',
      path: ['specialties'],
    }),
);

export type RegisterTenantDto = z.infer<typeof RegisterTenantSchema>;
