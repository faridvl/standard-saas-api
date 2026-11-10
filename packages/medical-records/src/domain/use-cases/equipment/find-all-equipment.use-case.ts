import { Injectable } from '@nestjs/common';
import { EquipmentStorage } from '@medical-records/infrastructure/adapters/equipmentRepository/equipment.storage';
import { EquipmentEntity } from '@medical-records/domain/entities/clinic-equipment.entity';
import { EQUIPMENT_LOCALE } from '@medical-records/domain/utils/equipment.util';

const collator = new Intl.Collator(EQUIPMENT_LOCALE, { sensitivity: 'base' });

/** Activos primero y luego por marca y modelo, sin distinguir mayúsculas ni tildes. */
function sortEquipment(equipment: EquipmentEntity[]): EquipmentEntity[] {
  return [...equipment].sort(
    (a, b) =>
      Number(b.isActive) - Number(a.isActive) ||
      collator.compare(a.brand, b.brand) ||
      collator.compare(a.model, b.model),
  );
}

@Injectable()
export class FindAllEquipmentUseCase {
  constructor(private readonly storage: EquipmentStorage) {}

  async execute(tenantUuid: string): Promise<EquipmentEntity[]> {
    return sortEquipment(await this.storage.findAll(tenantUuid));
  }
}
