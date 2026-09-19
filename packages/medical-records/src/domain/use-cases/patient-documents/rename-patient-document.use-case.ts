import { Injectable } from '@nestjs/common';
import { PatientDocumentStorage } from '@medical-records/infrastructure/adapters/patientDocumentRepository/patient-document.storage';

@Injectable()
export class RenamePatientDocumentUseCase {
  constructor(private readonly storage: PatientDocumentStorage) {}

  async execute(uuid: string, tenantUuid: string, originalName: string) {
    return await this.storage.rename(uuid, tenantUuid, originalName);
  }
}
