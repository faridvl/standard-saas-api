import { z } from 'zod';
import { passwordSchema } from '../validations/password.schema';

export const ChangeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Escribe tu contraseña actual'),
  newPassword: passwordSchema,
});

export type ChangeOwnPasswordDto = z.infer<typeof ChangeOwnPasswordSchema>;
