import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientBackgroundStorage } from '@medical-records/infrastructure/adapters/patientBackgroundRepository/patient-background.storage';
import { UpsertPatientBackgroundDto } from '@medical-records/app/dtos/patient-background.dto';
import { PatientBackgroundEntity } from '@medical-records/domain/entities/patient-background.entity';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

@Injectable()
export class UpsertPatientBackgroundUseCase {
  constructor(
    private readonly storage: PatientBackgroundStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    patientUuid: string,
    tenantUuid: string,
    actorUuid: string,
    dto: UpsertPatientBackgroundDto,
  ): Promise<PatientBackgroundEntity> {
    if (!(await this.storage.patientExists(patientUuid, tenantUuid))) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const existing = await this.storage.findByPatient(patientUuid);
    const saved = await this.storage.upsert(patientUuid, actorUuid, {
      ...dto,
      notes: dto.notes ?? null,
    });

    await this.recordActivity.execute({
      tenantUuid,
      patientUuid,
      actorUuid,
      action: existing
        ? PatientActivityAction.CLINICAL_HISTORY_UPDATED
        : PatientActivityAction.CLINICAL_HISTORY_CREATED,
    });

    return saved;
  }
}
