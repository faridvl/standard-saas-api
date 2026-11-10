import { ConflictException } from '@nestjs/common';
import { EquipmentEntity } from '@medical-records/domain/entities/clinic-equipment.entity';
import {
  EQUIPMENT_ALREADY_EXISTS_CODE,
  equipmentKey,
} from '@medical-records/domain/utils/equipment.util';

/** Marca + modelo son únicos por clínica sin distinguir mayúsculas (activos e inactivos). */
export function assertEquipmentFree(
  brand: string,
  model: string,
  equipment: EquipmentEntity[],
  exceptUuid?: string,
): void {
  const wanted = equipmentKey(brand, model);
  const taken = equipment.some(
    (item) => item.uuid !== exceptUuid && equipmentKey(item.brand, item.model) === wanted,
  );
  if (taken) {
    throw new ConflictException({
      message: 'Ya existe un equipo con esa marca y modelo',
      code: EQUIPMENT_ALREADY_EXISTS_CODE,
    });
  }
}
