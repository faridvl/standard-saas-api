import { Injectable } from '@nestjs/common';
import { Patient } from '@prisma/client';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';

@Injectable()
export class SoftDeletePatientUseCase {
  constructor(private readonly patientStorage: PatientStorage) {}

  async execute(uuid: string, tenantUuid: string): Promise<Patient> {
    return await this.patientStorage.softDelete(uuid, tenantUuid);
  }
}
