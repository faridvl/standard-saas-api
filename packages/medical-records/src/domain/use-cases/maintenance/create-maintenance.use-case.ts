import { Injectable } from '@nestjs/common';
import { MaintenanceStorage } from '@medical-records/infrastructure/adapters/maintenanceRepository/maintenance.storage';
import { CreateMaintenanceDto } from '@medical-records/app/dtos/maintenance.dto';
import { MaintenanceEntity } from '@medical-records/domain/entities/maintenance.entity';

import { TenantReferenceChecker } from '@medical-records/infrastructure/adapters/tenant/tenant-reference.checker';

@Injectable()
export class CreateMaintenanceUseCase {
  constructor(
    private readonly storage: MaintenanceStorage,
    private readonly references: TenantReferenceChecker,
  ) {}

  async execute(
    dto: CreateMaintenanceDto,
    context: { tenantUuid: string; userUuid: string },
  ): Promise<MaintenanceEntity> {
    await this.references.assertPatient(dto.patientUuid, context.tenantUuid);
    await this.references.assertDevice(dto.deviceUuid, context.tenantUuid);
    await this.references.assertEncounter(dto.encounterUuid, context.tenantUuid);
    return this.storage.save({
      patientUuid: dto.patientUuid,
      tenantUuid: context.tenantUuid,
      performedBy: context.userUuid,
      description: dto.description,
      nextMaintenanceAt: dto.nextMaintenanceAt ?? null,
      deviceUuid: dto.deviceUuid ?? null,
      encounterUuid: dto.encounterUuid ?? null,
    });
  }
}
