import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientOtoscopyEntryStorage } from '@medical-records/infrastructure/adapters/patientOtoscopyEntryRepository/patient-otoscopy-entry.storage';
import { CreatePatientOtoscopyEntryDto } from '@medical-records/app/dtos/patient-otoscopy-entry.dto';
import { PatientOtoscopyEntryEntity } from '@medical-records/domain/entities/patient-otoscopy-entry.entity';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import {
  PatientActivityAction,
  PatientFieldChange,
} from '@medical-records/domain/types/patient-activity.types';

@Injectable()
export class CreatePatientOtoscopyEntryUseCase {
  constructor(
    private readonly storage: PatientOtoscopyEntryStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    patientUuid: string,
    tenantUuid: string,
    actorUuid: string,
    dto: CreatePatientOtoscopyEntryDto,
  ): Promise<PatientOtoscopyEntryEntity> {
    if (!(await this.storage.patientExists(patientUuid, tenantUuid, { includeDeleted: false }))) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const saved = await this.storage.create({
      tenantUuid,
      patientUuid,
      otoscopyRight: dto.otoscopyRight ?? null,
      otoscopyLeft: dto.otoscopyLeft ?? null,
      createdByUuid: actorUuid,
    });

    // Mismo evento que la exploración física: la bitácora ya sabe mostrarlo.
    const changes: PatientFieldChange[] = [];
    if (saved.otoscopyRight) {
      changes.push({ field: 'otoscopyRight', before: null, after: saved.otoscopyRight });
    }
    if (saved.otoscopyLeft) {
      changes.push({ field: 'otoscopyLeft', before: null, after: saved.otoscopyLeft });
    }
    await this.recordActivity.execute({
      tenantUuid,
      patientUuid,
      actorUuid,
      action: PatientActivityAction.PHYSICAL_EXAM_UPDATED,
      detail: { changes },
    });

    const createdByName = await this.getOrCreateUser.execute(actorUuid, tenantUuid);
    return { ...saved, createdByName, updatedByName: null, canEdit: true };
  }
}
