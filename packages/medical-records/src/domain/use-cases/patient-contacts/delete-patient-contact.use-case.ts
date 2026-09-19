import { Injectable } from '@nestjs/common';
import { PatientContactStorage } from '@medical-records/infrastructure/adapters/patientContactRepository/patient-contact.storage';

@Injectable()
export class DeletePatientContactUseCase {
  constructor(private readonly storage: PatientContactStorage) {}

  async execute(uuid: string, tenantUuid: string): Promise<void> {
    await this.storage.delete(uuid, tenantUuid);
  }
}
