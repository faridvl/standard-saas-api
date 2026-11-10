import { Injectable } from '@nestjs/common';
import { EquipmentStorage } from '@medical-records/infrastructure/adapters/equipmentRepository/equipment.storage';
import { EquipmentEntity } from '@medical-records/domain/entities/clinic-equipment.entity';
import { CreateEquipmentDto } from '@medical-records/app/dtos/equipment.dto';
import { normalizeEquipmentText } from '@medical-records/domain/utils/equipment.util';
import { assertEquipmentFree } from './equipment-already-exists';

@Injectable()
export class CreateEquipmentUseCase {
  constructor(private readonly storage: EquipmentStorage) {}

  async execute(tenantUuid: string, dto: CreateEquipmentDto): Promise<EquipmentEntity> {
    const brand = normalizeEquipmentText(dto.brand);
    const model = normalizeEquipmentText(dto.model);
    assertEquipmentFree(brand, model, await this.storage.findAll(tenantUuid));
    return await this.storage.create(tenantUuid, { brand, model });
  }
}
