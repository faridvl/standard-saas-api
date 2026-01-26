import { z } from 'zod';

export const CreateOwnerSchema = z.object({
  businessName: z
    .string()
    // Si el valor no es un string o no viene, Zod usará este mensaje por defecto en .min(1)
    .min(1, 'El nombre de la clínica es requerido')
    .min(3, 'El nombre debe tener al menos 3 caracteres'),

  email: z.string().min(1, 'El correo es requerido').email('Formato de correo inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'), // <-- Añadir esto
});

export type CreateOwnerDto = z.infer<typeof CreateOwnerSchema>;
