import { Injectable, NotFoundException } from '@nestjs/common';
import { Patient } from '@prisma/client';
import {
  PatientStorage,
  maintenanceColumns,
} from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import {
  MaintenanceNumber,
  UpdatePatientMaintenanceDto,
} from '@medical-records/app/dtos/update-patient-maintenance.dto';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

/** Largo del extracto de la nota que se guarda en la bitácora. */
const NOTE_EXCERPT_LENGTH = 120;

/**
 * Mantenimiento 1 a 4 del paciente: un check y una nota opcional que el
 * personal cambia a mano, juntos o por separado. No se calcula desde las citas.
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
    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Paciente con UUID ${uuid} no encontrado`);
    }

    const columns = maintenanceColumns(number);
    const doneChanged = dto.done !== undefined && dto.done !== existing[columns.done];
    const noteChanged = dto.note !== undefined && dto.note !== existing[columns.note];
    if (!doneChanged && !noteChanged) return existing;

    const updated = await this.storage.updateMaintenance(uuid, tenantUuid, number, {
      done: doneChanged ? dto.done : undefined,
      note: noteChanged ? dto.note : undefined,
    });

    const base = { tenantUuid, patientUuid: uuid, actorUuid };
    if (doneChanged) {
      await this.recordActivity.execute({
        ...base,
        action: PatientActivityAction.MAINTENANCE_CHECK_CHANGED,
        detail: { number, done: dto.done as boolean },
      });
    }
    if (noteChanged) {
      await this.recordActivity.execute({
        ...base,
        action: PatientActivityAction.MAINTENANCE_NOTE_CHANGED,
        detail: { number, excerpt: dto.note ? dto.note.slice(0, NOTE_EXCERPT_LENGTH) : null },
      });
    }

    return updated;
  }
}
