import { Injectable } from '@nestjs/common';
import { EquipmentStorage } from '@medical-records/infrastructure/adapters/equipmentRepository/equipment.storage';
import { EquipmentEntity } from '@medical-records/domain/entities/clinic-equipment.entity';
import { CreateEquipmentDto } from '@medical-records/app/dtos/equipment.dto';
import { assertEquipmentFree } from './equipment-already-exists';

@Injectable()
export class CreateEquipmentUseCase {
  constructor(private readonly storage: EquipmentStorage) {}

  async execute(tenantUuid: string, dto: CreateEquipmentDto): Promise<EquipmentEntity> {
    assertEquipmentFree(dto.brand, dto.model, await this.storage.findAll(tenantUuid));
    return await this.storage.create(tenantUuid, { brand: dto.brand, model: dto.model });
  }
}
