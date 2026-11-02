import { z } from 'zod';
import { MaintenanceStatus } from '@prisma/client';

export const MAINTENANCE_NUMBERS = [1, 2, 3, 4] as const;
export type MaintenanceNumber = (typeof MAINTENANCE_NUMBERS)[number];

export const MAINTENANCE_NOTE_MAX_LENGTH = 500;

/** Número del mantenimiento en la URL: solo 1, 2, 3 o 4. */
export const MaintenanceNumberSchema = z
  .string()
  .regex(/^[1-4]$/, { message: 'El mantenimiento debe ser 1, 2, 3 o 4' })
  .transform((value) => Number(value) as MaintenanceNumber);

export const UpdatePatientMaintenanceSchema = z.object({
  status: z.nativeEnum(MaintenanceStatus, {
    message: 'El estado debe ser UNMARKED, ATTENDED o MISSED',
  }),
});

export type UpdatePatientMaintenanceDto = z.infer<typeof UpdatePatientMaintenanceSchema>;

export const CreatePatientMaintenanceNoteSchema = z.object({
  text: z
    .string({ message: 'La nota es obligatoria' })
    .trim()
    .min(1, { message: 'La nota es obligatoria' })
    .max(MAINTENANCE_NOTE_MAX_LENGTH, {
      message: `La nota no puede superar ${MAINTENANCE_NOTE_MAX_LENGTH} caracteres`,
    }),
});

export type CreatePatientMaintenanceNoteDto = z.infer<typeof CreatePatientMaintenanceNoteSchema>;
