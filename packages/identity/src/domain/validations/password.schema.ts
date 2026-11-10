import { z } from 'zod';

export const PASSWORD_MAX_BYTES = 72;

export const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Debe tener una mayúscula')
  .regex(/[0-9]/, 'Debe tener un número')
  // bcrypt solo usa los primeros 72 bytes: el resto se ignoraría sin avisar.
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= PASSWORD_MAX_BYTES,
    'La contraseña es demasiado larga',
  );
