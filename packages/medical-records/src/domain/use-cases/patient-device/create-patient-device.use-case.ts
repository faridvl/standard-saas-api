import { Injectable } from '@nestjs/common';
import { PatientDeviceStorage } from '@medical-records/infrastructure/adapters/patientDeviceRepository/patient-device.storage';

export interface CreatePatientDeviceData {
  patientUuid: string;
  tenantUuid: string;
  side: string;
  productUuid?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: Date;
  warrantyUntil?: Date;
  notes?: string;
}

@Injectable()
export class CreatePatientDeviceUseCase {
  constructor(private readonly storage: PatientDeviceStorage) {}

  async execute(data: CreatePatientDeviceData) {
    return await this.storage.create({
      uuid: undefined as any,
      patient: { connect: { uuid: data.patientUuid } },
      tenantUuid: data.tenantUuid,
      side: data.side,
      productUuid: data.productUuid,
      brand: data.brand,
      model: data.model,
      serialNumber: data.serialNumber,
      purchaseDate: data.purchaseDate,
      warrantyUntil: data.warrantyUntil,
      notes: data.notes,
    });
  }
}
