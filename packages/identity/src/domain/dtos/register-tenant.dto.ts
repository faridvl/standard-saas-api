import { z } from 'zod';

export const RegisterTenantSchema = z.object({
  businessName: z.string().min(1, 'El nombre de la empresa es obligatorio'),
  businessType: z.string().optional(),
  ownerName: z.string().min(1, 'El nombre del dueño es obligatorio'),
  email: z.string().email('Formato de email inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula') // <--- Mayúscula
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'), // <--- Número
});

// Extraemos el Type automáticamente del esquema (Inferencia de Zod)
export type RegisterTenantDto = z.infer<typeof RegisterTenantSchema>;
