import { MedicalSpeciality } from './medical-control-content.types';

/**
 * Hora (UTC) con la que `POST next-appointment` guarda una cita de la que solo
 * se sabe el día: startTime es obligatorio en el schema (compartido con
 * Zynka). Una cita a esta hora exacta se lee como "sin hora" (en el
 * calendario suscrito, evento de día completo). El back-office le fija la
 * hora real después con `PATCH /appointments/:uuid`.
 */
export const DEFAULT_APPOINTMENT_HOUR_UTC = 8;

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
  branchUUID?: string | null;
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
