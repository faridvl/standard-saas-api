import { Injectable } from '@nestjs/common';
import { MaintenanceStorage } from '@medical-records/infrastructure/adapters/maintenanceRepository/maintenance.storage';
import { MaintenanceEntity } from '@medical-records/domain/entities/maintenance.entity';

@Injectable()
export class FindUpcomingMaintenanceUseCase {
  constructor(private readonly storage: MaintenanceStorage) {}

  async execute(tenantUuid: string, month: string): Promise<MaintenanceEntity[]> {
    return this.storage.findUpcoming(tenantUuid, month);
  }
}
