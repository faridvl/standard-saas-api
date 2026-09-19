import { Injectable } from '@nestjs/common';
import { PatientDocument } from '@prisma/client';
import { PatientDocumentStorage } from '@medical-records/infrastructure/adapters/patientDocumentRepository/patient-document.storage';

@Injectable()
export class DeletePatientDocumentUseCase {
  constructor(private readonly storage: PatientDocumentStorage) {}

  async execute(uuid: string, tenantUuid: string): Promise<PatientDocument> {
    return await this.storage.delete(uuid, tenantUuid);
  }
}
