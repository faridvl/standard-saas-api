import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PatientStorage,
  maintenanceStatusColumn,
} from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import {
  MaintenanceNumber,
  UpdatePatientMaintenanceDto,
} from '@medical-records/app/dtos/update-patient-maintenance.dto';
import { PatientRecord } from '@medical-records/domain/types/patient-record.type';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

/**
 * Estado del mantenimiento 1 a 4 del paciente (sin marcar, asistido o
 * perdido), que el personal cambia a mano. No se calcula desde las citas.
 */
@Injectable()
export class UpdatePatientMaintenanceUseCase {
  constructor(
    private readonly storage: PatientStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    uuid: string,
    tenantUuid: string,
    actorUuid: string,
    number: MaintenanceNumber,
    dto: UpdatePatientMaintenanceDto,
  ): Promise<PatientRecord> {
    const existing = await this.storage.findByUuid(uuid, tenantUuid);
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const previousStatus = existing[maintenanceStatusColumn(number)];
    if (dto.status === previousStatus) return existing;

    const updated = await this.storage.updateMaintenance(uuid, tenantUuid, number, dto.status);

    await this.recordActivity.execute({
      tenantUuid,
      patientUuid: uuid,
      actorUuid,
      action: PatientActivityAction.MAINTENANCE_CHANGED,
      detail: { number, status: dto.status, previousStatus },
    });

    return updated;
  }
}
