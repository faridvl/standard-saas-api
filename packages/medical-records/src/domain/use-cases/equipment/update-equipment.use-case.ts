import { Injectable, NotFoundException } from '@nestjs/common';
import { EquipmentStorage } from '@medical-records/infrastructure/adapters/equipmentRepository/equipment.storage';
import { EquipmentEntity } from '@medical-records/domain/entities/clinic-equipment.entity';
import { UpdateEquipmentDto } from '@medical-records/app/dtos/equipment.dto';
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
    if (dto.brand !== undefined || dto.model !== undefined) {
      assertEquipmentFree(dto.brand ?? current.brand, dto.model ?? current.model, all, uuid);
    }

    const updated = await this.storage.update(tenantUuid, uuid, {
      ...(dto.brand !== undefined && { brand: dto.brand }),
      ...(dto.model !== undefined && { model: dto.model }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });
    if (!updated) throw new NotFoundException('Equipo no encontrado');
    return updated;
  }
}
