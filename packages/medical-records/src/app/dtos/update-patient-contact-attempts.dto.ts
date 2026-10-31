import { z } from 'zod';

export const MAX_CONTACT_ATTEMPTS = 3;

/** Valor absoluto del contador: 0 lo reinicia. */
export const UpdatePatientContactAttemptsSchema = z.object({
  count: z
    .number({ message: 'count debe ser un número entero' })
    .int({ message: 'count debe ser un número entero' })
    .min(0, { message: `count debe estar entre 0 y ${MAX_CONTACT_ATTEMPTS}` })
    .max(MAX_CONTACT_ATTEMPTS, { message: `count debe estar entre 0 y ${MAX_CONTACT_ATTEMPTS}` }),
});

export type UpdatePatientContactAttemptsDto = z.infer<typeof UpdatePatientContactAttemptsSchema>;
