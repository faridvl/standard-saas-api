import { Injectable } from '@nestjs/common';
import { PatientContactStorage, CreatePatientContactData } from '@medical-records/infrastructure/adapters/patientContactRepository/patient-contact.storage';

@Injectable()
export class CreatePatientContactUseCase {
  constructor(private readonly storage: PatientContactStorage) {}

  async execute(data: CreatePatientContactData) {
    return await this.storage.create(data);
  }
}
