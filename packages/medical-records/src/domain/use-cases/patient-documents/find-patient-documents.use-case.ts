import { Injectable } from '@nestjs/common';
import { PatientDocumentStorage } from '@medical-records/infrastructure/adapters/patientDocumentRepository/patient-document.storage';

@Injectable()
export class FindPatientDocumentsUseCase {
  constructor(private readonly storage: PatientDocumentStorage) {}

  async execute(patientUuid: string, tenantUuid: string) {
    return await this.storage.findAllByPatient(patientUuid, tenantUuid);
  }
}
