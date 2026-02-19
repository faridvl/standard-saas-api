import { MedicalSpeciality } from './medical-control-content.types';

export enum AppointmentStatus {
  TENTATIVE = 'TENTATIVE',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  WAITING = 'WAITING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export interface AppointmentType {
  id: string;
  name: string;
  duration: number;
  tenantUUID: string;
}

export interface Appointment {
  id: string;
  patientUUID: string;
  userUUID: string;
  typeUUID?: string | null;
  tenantUUID: string;
  speciality: MedicalSpeciality;
  status: AppointmentStatus;

  schedule: {
    date: Date;
    startTime: Date;
    endTime: Date;
  };

  notes?: string;

  patientName?: string;
  typeName?: string;
  medicalControlUUID?: string;

  createdAt: Date;
  updatedAt: Date;
}
