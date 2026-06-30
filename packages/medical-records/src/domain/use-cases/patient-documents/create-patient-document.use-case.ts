import { Injectable } from '@nestjs/common';
import { PatientDocumentStorage, CreatePatientDocumentData } from '@medical-records/infrastructure/adapters/patientDocumentRepository/patient-document.storage';

@Injectable()
export class CreatePatientDocumentUseCase {
  constructor(private readonly storage: PatientDocumentStorage) {}

  async execute(data: CreatePatientDocumentData) {
    return await this.storage.create(data);
  }
}
