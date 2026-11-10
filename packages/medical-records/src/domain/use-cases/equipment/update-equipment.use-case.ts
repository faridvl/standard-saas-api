import { Injectable, NotFoundException } from '@nestjs/common';
import { EquipmentStorage } from '@medical-records/infrastructure/adapters/equipmentRepository/equipment.storage';
import { EquipmentEntity } from '@medical-records/domain/entities/clinic-equipment.entity';
import { UpdateEquipmentDto } from '@medical-records/app/dtos/equipment.dto';
import { normalizeEquipmentText } from '@medical-records/domain/utils/equipment.util';
import { assertEquipmentFree } from './equipment-already-exists';

@Injectable()
export class UpdateEquipmentUseCase {
  constructor(private readonly storage: EquipmentStorage) {}

  async execute(
    tenantUuid: string,
    uuid: string,
    dto: UpdateEquipmentDto,
  ): Promise<EquipmentEntity> {
    const all = await this.storage.findAll(tenantUuid);
    const current = all.find((item) => item.uuid === uuid);
    if (!current) {
      throw new NotFoundException('Equipo no encontrado');
    }
    const brand = dto.brand === undefined ? undefined : normalizeEquipmentText(dto.brand);
    const model = dto.model === undefined ? undefined : normalizeEquipmentText(dto.model);
    if (brand !== undefined || model !== undefined) {
      assertEquipmentFree(brand ?? current.brand, model ?? current.model, all, uuid);
    }

    const updated = await this.storage.update(tenantUuid, uuid, {
      ...(brand !== undefined && { brand }),
      ...(model !== undefined && { model }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });
    if (!updated) throw new NotFoundException('Equipo no encontrado');
    return updated;
  }
}
