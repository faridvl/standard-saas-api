import { Injectable, NotFoundException } from '@nestjs/common';
import { MaintenanceStatus, Patient } from '@prisma/client';
import {
  PatientStorage,
  maintenanceColumn,
} from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import {
  MaintenanceNumber,
  UpdatePatientMaintenanceDto,
} from '@medical-records/app/dtos/update-patient-maintenance.dto';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

/**
 * Mantenimiento 1 a 4 del paciente: el personal lo marca a mano como asistido
 * o perdido, o lo deja sin marcar (null). No se calcula desde las citas.
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
  ): Promise<Patient> {
    const existing = await this.storage.findByUuid(uuid, tenantUuid);
    if (!existing) {
      throw new NotFoundException(`Paciente con UUID ${uuid} no encontrado`);
    }

    const previousStatus: MaintenanceStatus | null = existing[maintenanceColumn(number)];
    if (previousStatus === dto.status) return existing;

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
