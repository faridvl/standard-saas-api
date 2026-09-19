import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Patient } from '@prisma/client';

@Injectable()
export class GetPatientByUuidUseCase {
  constructor(private readonly patientStorage: PatientStorage) {}

  async execute(uuid: string, tenantUuid: string): Promise<Patient> {
    const patient = await this.patientStorage.findByUuid(uuid, tenantUuid);

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    return patient;
  }
}
