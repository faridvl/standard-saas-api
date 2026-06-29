import { Injectable } from '@nestjs/common';
import { MaintenanceStorage } from '@medical-records/infrastructure/adapters/maintenanceRepository/maintenance.storage';
import { CreateMaintenanceDto } from '@medical-records/app/dtos/maintenance.dto';
import { MaintenanceEntity } from '@medical-records/domain/entities/maintenance.entity';

@Injectable()
export class CreateMaintenanceUseCase {
  constructor(private readonly storage: MaintenanceStorage) {}

  async execute(
    dto: CreateMaintenanceDto,
    context: { tenantUuid: string; userUuid: string },
  ): Promise<MaintenanceEntity> {
    return this.storage.save({
      patientUuid: dto.patientUuid,
      tenantUuid: context.tenantUuid,
      performedBy: context.userUuid,
      description: dto.description,
      nextMaintenanceAt: dto.nextMaintenanceAt ?? null,
      deviceUuid: dto.deviceUuid ?? null,
    });
  }
}
