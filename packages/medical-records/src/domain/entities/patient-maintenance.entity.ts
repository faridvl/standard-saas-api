import { MaintenanceStatus } from '@prisma/client';

export interface PatientMaintenanceNoteEntity {
  uuid: string;
  text: string;
  createdAt: Date;
  createdByUuid: string | null;
  createdByName: string | null;
}

/** Un mantenimiento (1 a 4) con su estado y su historial de notas, la más nueva primero. */
export interface PatientMaintenanceEntity {
  number: number;
  status: MaintenanceStatus;
  notes: PatientMaintenanceNoteEntity[];
}
