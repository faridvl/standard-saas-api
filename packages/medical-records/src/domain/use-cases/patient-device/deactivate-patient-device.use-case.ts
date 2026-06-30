import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientDeviceStorage } from '@medical-records/infrastructure/adapters/patientDeviceRepository/patient-device.storage';
import { ProductUnitStorage } from '@medical-records/infrastructure/adapters/productUnitRepository/product-unit.storage';

@Injectable()
export class DeactivatePatientDeviceUseCase {
  constructor(
    private readonly storage: PatientDeviceStorage,
    private readonly unitStorage: ProductUnitStorage,
  ) {}

  async execute(uuid: string, tenantUuid: string) {
    const device = await this.storage.findOne(uuid);
    if (!device) throw new NotFoundException('Dispositivo no encontrado');

    await this.storage.deactivate(uuid, tenantUuid);

    if (device.productUnit?.uuid) {
      await this.unitStorage.release(device.productUnit.uuid);
    }
  }
}
