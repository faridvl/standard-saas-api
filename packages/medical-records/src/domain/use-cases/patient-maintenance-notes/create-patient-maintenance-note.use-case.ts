import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientMaintenanceNoteStorage } from '@medical-records/infrastructure/adapters/patientMaintenanceNoteRepository/patient-maintenance-note.storage';
import { PatientMaintenanceNoteEntity } from '@medical-records/domain/entities/patient-maintenance.entity';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';
import {
  CreatePatientMaintenanceNoteDto,
  MaintenanceNumber,
} from '@medical-records/app/dtos/update-patient-maintenance.dto';

/** Agrega una nota al historial del mantenimiento; no se editan ni se borran. */
@Injectable()
export class CreatePatientMaintenanceNoteUseCase {
  constructor(
    private readonly storage: PatientMaintenanceNoteStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    patientUuid: string,
    tenantUuid: string,
    actorUuid: string,
    number: MaintenanceNumber,
    dto: CreatePatientMaintenanceNoteDto,
  ): Promise<PatientMaintenanceNoteEntity> {
    if (!(await this.storage.patientExists(patientUuid, tenantUuid))) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const note = await this.storage.create({
      patientUuid,
      tenantUuid,
      number,
      text: dto.text,
      createdByUuid: actorUuid,
    });

    await this.recordActivity.execute({
      tenantUuid,
      patientUuid,
      actorUuid,
      action: PatientActivityAction.MAINTENANCE_NOTE_ADDED,
      detail: { number },
    });

    return {
      uuid: note.uuid,
      text: note.text,
      createdAt: note.createdAt,
      createdByUuid: note.createdByUuid,
      createdByName: await this.getOrCreateUser.execute(actorUuid, tenantUuid),
    };
  }
}
