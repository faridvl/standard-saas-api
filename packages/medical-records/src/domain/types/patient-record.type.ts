import { Patient } from '@prisma/client';

/**
 * Columnas de mantenimiento sin uso (reemplazadas por `maintenanceNStatus` y
 * `PatientMaintenanceNote`). Siguen en la tabla hasta una migración de limpieza.
 */
export const LEGACY_MAINTENANCE_COLUMNS = {
  maintenance1Done: true,
  maintenance1Note: true,
  maintenance2Done: true,
  maintenance2Note: true,
  maintenance3Done: true,
  maintenance3Note: true,
  maintenance4Done: true,
  maintenance4Note: true,
} as const;

/** Paciente tal como lo lee el API: sin las columnas de mantenimiento sin uso. */
export type PatientRecord = Omit<Patient, keyof typeof LEGACY_MAINTENANCE_COLUMNS>;
