import { Module } from '@nestjs/common';
import { EquipmentController } from '../controllers/equipment.controller';
import { EquipmentStorage } from '@medical-records/infrastructure/adapters/equipmentRepository/equipment.storage';
import {
  CreateEquipmentUseCase,
  FindAllEquipmentUseCase,
  UpdateEquipmentUseCase,
} from '@medical-records/domain/use-cases/equipment';

const CONTROLLERS = [EquipmentController];
const USE_CASES = [FindAllEquipmentUseCase, CreateEquipmentUseCase, UpdateEquipmentUseCase];
const STORAGES = [EquipmentStorage];

@Module({
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class EquipmentModule {}
