import { Injectable } from '@nestjs/common';
import { PatientDeviceStorage } from '@medical-records/infrastructure/adapters/patientDeviceRepository/patient-device.storage';

@Injectable()
export class DeactivatePatientDeviceUseCase {
  constructor(private readonly storage: PatientDeviceStorage) {}

  async execute(uuid: string, tenantUuid: string) {
    return await this.storage.deactivate(uuid, tenantUuid);
  }
}
