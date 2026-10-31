import { z } from 'zod';

export const MAX_CONTACT_ATTEMPTS = 3;

const buildAttemptsField = (field: string) =>
  z
    .number({ message: `${field} debe ser un número entero` })
    .int({ message: `${field} debe ser un número entero` })
    .min(0, { message: `${field} debe estar entre 0 y ${MAX_CONTACT_ATTEMPTS}` })
    .max(MAX_CONTACT_ATTEMPTS, { message: `${field} debe estar entre 0 y ${MAX_CONTACT_ATTEMPTS}` });

/**
 * `count` es el valor absoluto nuevo (0 reinicia). `expectedCount` es el valor
 * que la persona vio en pantalla: si ya cambió, la escritura se rechaza.
 */
export const UpdatePatientContactAttemptsSchema = z.object({
  count: buildAttemptsField('count'),
  expectedCount: buildAttemptsField('expectedCount'),
});

export type UpdatePatientContactAttemptsDto = z.infer<typeof UpdatePatientContactAttemptsSchema>;
