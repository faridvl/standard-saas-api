import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PatientDeviceStorage } from '@medical-records/infrastructure/adapters/patientDeviceRepository/patient-device.storage';
import { ProductUnitStorage } from '@medical-records/infrastructure/adapters/productUnitRepository/product-unit.storage';

export interface CreatePatientDeviceData {
  patientUuid: string;
  tenantUuid: string;
  side: string;
  productUnitUuid: string;
  notes?: string;
}

@Injectable()
export class CreatePatientDeviceUseCase {
  constructor(
    private readonly storage: PatientDeviceStorage,
    private readonly unitStorage: ProductUnitStorage,
  ) {}

  async execute(data: CreatePatientDeviceData) {
    const unit = await this.unitStorage.findOne(data.productUnitUuid);
    if (!unit) throw new NotFoundException('Unidad de producto no encontrada');
    if (unit.status !== 'AVAILABLE') {
      throw new ConflictException(
        `La unidad con serial "${unit.serialNumber}" no está disponible (estado: ${unit.status})`,
      );
    }

    const unitId = await this.unitStorage.findRawId(data.productUnitUuid);

    const device = await this.storage.create({
      patientUuid: data.patientUuid,
      tenantUuid: data.tenantUuid,
      side: data.side,
      productUnitId: unitId!,
      notes: data.notes,
    });

    await this.unitStorage.assign(data.productUnitUuid, data.patientUuid);

    return device;
  }
}
