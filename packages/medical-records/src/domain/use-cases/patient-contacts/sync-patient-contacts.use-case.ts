import { Injectable } from '@nestjs/common';
import { PatientContact } from '@prisma/client';
import {
  PatientContactStorage,
  SyncPatientContactItem,
} from '@medical-records/infrastructure/adapters/patientContactRepository/patient-contact.storage';

@Injectable()
export class SyncPatientContactsUseCase {
  constructor(private readonly storage: PatientContactStorage) {}

  async execute(
    patientUuid: string,
    tenantUuid: string,
    items: SyncPatientContactItem[],
  ): Promise<PatientContact[]> {
    return await this.storage.sync(patientUuid, tenantUuid, items);
  }
}
