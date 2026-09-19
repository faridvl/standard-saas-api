import { Injectable } from '@nestjs/common';
import { PatientContact } from '@prisma/client';
import { PatientContactStorage } from '@medical-records/infrastructure/adapters/patientContactRepository/patient-contact.storage';

@Injectable()
export class FindPatientContactsUseCase {
  constructor(private readonly storage: PatientContactStorage) {}

  async execute(patientUuid: string, tenantUuid: string): Promise<PatientContact[]> {
    return await this.storage.findAllByPatient(patientUuid, tenantUuid);
  }
}
