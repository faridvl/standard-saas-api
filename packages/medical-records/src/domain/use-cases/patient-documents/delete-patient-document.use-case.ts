import { Injectable } from '@nestjs/common';
import { PatientDocumentStorage } from '@medical-records/infrastructure/adapters/patientDocumentRepository/patient-document.storage';

@Injectable()
export class DeletePatientDocumentUseCase {
  constructor(private readonly storage: PatientDocumentStorage) {}

  async execute(uuid: string, tenantUuid: string) {
    return await this.storage.delete(uuid, tenantUuid);
  }
}
