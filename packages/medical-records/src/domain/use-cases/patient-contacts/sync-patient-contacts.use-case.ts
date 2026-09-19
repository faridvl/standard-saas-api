import { Injectable } from '@nestjs/common';
import { PatientContactStorage, SyncPatientContactItem } from '@medical-records/infrastructure/adapters/patientContactRepository/patient-contact.storage';

@Injectable()
export class SyncPatientContactsUseCase {
  constructor(private readonly storage: PatientContactStorage) {}

  async execute(patientUuid: string, tenantUuid: string, items: SyncPatientContactItem[]) {
    return await this.storage.sync(patientUuid, tenantUuid, items);
  }
}
