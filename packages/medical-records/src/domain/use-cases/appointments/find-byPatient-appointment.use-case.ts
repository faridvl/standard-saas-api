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
    const appointments = await this.appointmentStorage.findByPatient(patientUUID, tenantUUID);

    if (appointments.length > 0) {
      return {
        patient: {
          uuid: patientUUID,
          name: appointments[0].patientName,
        },
        appointments,
      };
    }

    const patient = await this.patientStorage.findByUuid(patientUUID, tenantUUID);

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    return {
      patient: {
        uuid: patient.uuid,
        name: `${patient.firstName} ${patient.lastName}`,
      },
      appointments: [],
    };
  }
}
