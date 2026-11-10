import { z } from 'zod';
import { PASSWORD_MAX_BYTES, passwordSchema } from '../validations/password.schema';

export const ChangeOwnPasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Escribe tu contraseña actual')
    .refine(
      (value) => Buffer.byteLength(value, 'utf8') <= PASSWORD_MAX_BYTES,
      'La contraseña es demasiado larga',
    ),
  newPassword: passwordSchema,
});

export type ChangeOwnPasswordDto = z.infer<typeof ChangeOwnPasswordSchema>;
