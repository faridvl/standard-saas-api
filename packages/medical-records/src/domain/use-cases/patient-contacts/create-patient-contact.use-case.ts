import { Injectable } from '@nestjs/common';
import { PatientContact } from '@prisma/client';
import { PatientContactStorage, CreatePatientContactData } from '@medical-records/infrastructure/adapters/patientContactRepository/patient-contact.storage';

@Injectable()
export class CreatePatientContactUseCase {
  constructor(private readonly storage: PatientContactStorage) {}

  async execute(data: CreatePatientContactData): Promise<PatientContact> {
    return await this.storage.create(data);
  }
}
