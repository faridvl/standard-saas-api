import { Injectable } from '@nestjs/common';
import { MaintenanceStorage } from '@medical-records/infrastructure/adapters/maintenanceRepository/maintenance.storage';
import { MaintenanceEntity } from '@medical-records/domain/entities/maintenance.entity';

@Injectable()
export class FindByPatientMaintenanceUseCase {
  constructor(private readonly storage: MaintenanceStorage) {}

  async execute(patientUuid: string, tenantUuid: string): Promise<MaintenanceEntity[]> {
    return this.storage.findByPatient(patientUuid, tenantUuid);
  }
}
