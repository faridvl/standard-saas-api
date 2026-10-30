import { z } from 'zod';
import { MaintenanceStatus } from '@prisma/client';

export const MAINTENANCE_NUMBERS = [1, 2, 3, 4] as const;
export type MaintenanceNumber = (typeof MAINTENANCE_NUMBERS)[number];

/** Número del mantenimiento en la URL: solo 1, 2, 3 o 4. */
export const MaintenanceNumberSchema = z
  .string()
  .regex(/^[1-4]$/, { message: 'El mantenimiento debe ser 1, 2, 3 o 4' })
  .transform((value) => Number(value) as MaintenanceNumber);

/** `status` es obligatorio: null desmarca el mantenimiento. */
export const UpdatePatientMaintenanceSchema = z.object({
  status: z.union([z.nativeEnum(MaintenanceStatus), z.null()], {
    message: 'El estado debe ser ATTENDED, MISSED o null',
  }),
});

export type UpdatePatientMaintenanceDto = z.infer<typeof UpdatePatientMaintenanceSchema>;
