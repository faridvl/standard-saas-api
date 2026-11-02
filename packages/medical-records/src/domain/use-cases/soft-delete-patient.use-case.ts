import { Injectable } from '@nestjs/common';
import { PatientRecord } from '@medical-records/domain/types/patient-record.type';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';

@Injectable()
export class SoftDeletePatientUseCase {
  constructor(private readonly patientStorage: PatientStorage) {}

  async execute(uuid: string, tenantUuid: string): Promise<PatientRecord> {
    return await this.patientStorage.softDelete(uuid, tenantUuid);
  }
}
