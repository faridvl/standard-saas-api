import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetPatientsUseCase {
  constructor(private readonly patientStorage: PatientStorage) {}

  async execute(tenantUUID: string, page: number, limit: number, includeInactive = false, search?: string) {
    return await this.patientStorage.findAllByTenant(tenantUUID, page, limit, includeInactive, search);
  }
}
