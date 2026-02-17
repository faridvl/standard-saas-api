import { MedicalSpeciality, MedicalFindingsMap } from '../types/medical-control-content.types';

export type MedicalControlEntity<T extends MedicalSpeciality = MedicalSpeciality> = {
  uuid: string;
  doctorUuid: string;
  tenantUuid: string;
  createdAt: string;
  header: {
    patientUUID: string;
    appointmentUUID?: string | null;
    speciality: T;
    schemaVersion: number;
  };
  clinicalData: {
    findings: MedicalFindingsMap[T];
    diagnosis: string;
  };
};
