import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { Appointment } from '@medical-records/domain/types/appointment.types';
import { Injectable, NotFoundException } from '@nestjs/common';

export interface PatientAppointmentsResult {
  patient: {
    uuid: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
  appointments: Appointment[];
}

@Injectable()
export class GetAppointmentsByPatientUseCase {
  constructor(
    private readonly appointmentStorage: AppointmentStorage,
    private readonly patientStorage: PatientStorage,
  ) {}

  async execute(patientUUID: string, tenantUUID: string): Promise<PatientAppointmentsResult> {
    const patient = await this.patientStorage.findByUuid(patientUUID, tenantUUID);

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const appointments = await this.appointmentStorage.findByPatient(patientUUID, tenantUUID);

    return {
      patient: {
        uuid: patient.uuid,
        name: `${patient.firstName} ${patient.lastName}`,
        phone: patient.phone ?? null,
        email: patient.email ?? null,
      },
      appointments,
    };
  }
}
