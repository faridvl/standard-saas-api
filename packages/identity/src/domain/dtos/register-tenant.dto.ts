import { z } from 'zod';

export const BusinessTypeValues = ['AUDIOLOGY', 'DENTAL', 'GENERAL', 'OTHER'] as const;
export type BusinessType = (typeof BusinessTypeValues)[number];

export const RegisterTenantSchema = z
  .object({
    businessName: z.string().min(1, 'El nombre de la empresa es obligatorio'),
    businessType: z.enum(BusinessTypeValues).default('GENERAL'),
    ownerName: z.string().min(1, 'El nombre del dueño es obligatorio'),
    phone: z.string().optional(),
    email: z.string().email('Formato de email inválido'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
    isSpecialist: z.boolean().default(false),
    specialty: z.string().optional(),
  })
  .refine((data) => !data.isSpecialist || (data.specialty && data.specialty.length > 0), {
    message: 'La especialidad es obligatoria si eres especialista',
    path: ['specialty'],
  });

export type RegisterTenantDto = z.infer<typeof RegisterTenantSchema>;
