import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class GetAppointmentsByPatientUseCase {
  constructor(
    private readonly appointmentStorage: AppointmentStorage,
    private readonly patientStorage: PatientStorage,
  ) {}

  async execute(patientUUID: string, tenantUUID: string): Promise<any> {
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
