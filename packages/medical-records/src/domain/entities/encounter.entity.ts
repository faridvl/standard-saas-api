import { MedicalControl, Maintenance, Study } from '@prisma/client';
import { EncounterStatus } from '../types/encounter.types';

export interface EncounterEntity {
  uuid: string;
  patientUuid: string;
  tenantUuid: string;
  autorUuid: string;
  especialidad: string;
  appointmentUuid: string | null;
  startedAt: string;
  closedAt: string | null;
  status: EncounterStatus;
}

export interface EncounterDetail extends EncounterEntity {
  medicalControls: MedicalControl[];
  maintenances: Maintenance[];
  studies: Study[];
}
