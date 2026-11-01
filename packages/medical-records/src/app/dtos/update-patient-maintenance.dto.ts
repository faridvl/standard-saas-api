import { z } from 'zod';

export const MAINTENANCE_NUMBERS = [1, 2, 3, 4] as const;
export type MaintenanceNumber = (typeof MAINTENANCE_NUMBERS)[number];

export const MAINTENANCE_NOTE_MAX_LENGTH = 500;

/** Número del mantenimiento en la URL: solo 1, 2, 3 o 4. */
export const MaintenanceNumberSchema = z
  .string()
  .regex(/^[1-4]$/, { message: 'El mantenimiento debe ser 1, 2, 3 o 4' })
  .transform((value) => Number(value) as MaintenanceNumber);

/**
 * `done` y `note` son opcionales por separado: la pantalla guarda el check al
 * tocarlo y la nota al salir del campo. Una nota vacía se guarda como null.
 */
export const UpdatePatientMaintenanceSchema = z
  .object({
    done: z.boolean({ message: 'done debe ser verdadero o falso' }).optional(),
    note: z
      .string({ message: 'note debe ser texto o null' })
      .trim()
      .max(MAINTENANCE_NOTE_MAX_LENGTH, {
        message: `La nota no puede superar ${MAINTENANCE_NOTE_MAX_LENGTH} caracteres`,
      })
      .transform((value) => (value === '' ? null : value))
      .nullable()
      .optional(),
  })
  .refine((value) => value.done !== undefined || value.note !== undefined, {
    message: 'Indica done, note o ambos',
  });

export type UpdatePatientMaintenanceDto = z.infer<typeof UpdatePatientMaintenanceSchema>;
