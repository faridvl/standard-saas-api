import { z } from 'zod';
import { passwordSchema } from '../validations/password.schema';

export const ResetUserPasswordSchema = z.object({
  password: passwordSchema,
});

export type ResetUserPasswordDto = z.infer<typeof ResetUserPasswordSchema>;
