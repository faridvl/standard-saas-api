import { Module } from '@nestjs/common';
import { MaintenanceController } from '../controllers/maintenance.controller';
import { MaintenanceStorage } from '@medical-records/infrastructure/adapters/maintenanceRepository/maintenance.storage';
import {
  CreateMaintenanceUseCase,
  FindByPatientMaintenanceUseCase,
  FindUpcomingMaintenanceUseCase,
} from '@medical-records/domain/use-cases/maintenance';

const CONTROLLERS = [MaintenanceController];
const USE_CASES = [
  CreateMaintenanceUseCase,
  FindByPatientMaintenanceUseCase,
  FindUpcomingMaintenanceUseCase,
];
const STORAGES = [MaintenanceStorage];

@Module({
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class MaintenanceModule {}
