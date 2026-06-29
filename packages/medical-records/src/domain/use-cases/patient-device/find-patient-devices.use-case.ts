import { Injectable } from '@nestjs/common';
import { PatientDeviceStorage } from '@medical-records/infrastructure/adapters/patientDeviceRepository/patient-device.storage';

@Injectable()
export class FindPatientDevicesUseCase {
  constructor(private readonly storage: PatientDeviceStorage) {}

  async execute(patientUuid: string, tenantUuid: string) {
    return await this.storage.findAllByPatient(patientUuid, tenantUuid);
  }
}
