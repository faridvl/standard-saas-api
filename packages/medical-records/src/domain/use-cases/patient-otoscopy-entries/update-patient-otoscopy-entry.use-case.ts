import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PatientOtoscopyEntryStorage } from '@medical-records/infrastructure/adapters/patientOtoscopyEntryRepository/patient-otoscopy-entry.storage';
import { UpdatePatientOtoscopyEntryDto } from '@medical-records/app/dtos/patient-otoscopy-entry.dto';
import { PatientOtoscopyEntryEntity } from '@medical-records/domain/entities/patient-otoscopy-entry.entity';
import { isSameClinicDay } from '@medical-records/domain/utils/clinic-day.util';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import {
  PatientActivityAction,
  PatientFieldChange,
} from '@medical-records/domain/types/patient-activity.types';

const EDITABLE_FIELDS = ['otoscopyRight', 'otoscopyLeft'] as const;

@Injectable()
export class UpdatePatientOtoscopyEntryUseCase {
  constructor(
    private readonly storage: PatientOtoscopyEntryStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    patientUuid: string,
    entryUuid: string,
    tenantUuid: string,
    actorUuid: string,
    dto: UpdatePatientOtoscopyEntryDto,
    now: Date = new Date(),
  ): Promise<PatientOtoscopyEntryEntity> {
    if (!(await this.storage.patientExists(patientUuid, tenantUuid, { includeDeleted: false }))) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const { entry: saved, changes } = await this.storage.update(
      entryUuid,
      patientUuid,
      tenantUuid,
      (entry) => {
        if (!isSameClinicDay(entry.createdAt, now)) {
          throw new ConflictException(
            'Esta otoscopia ya no se puede corregir porque no es de hoy.',
          );
        }

        const next = {
          otoscopyRight: dto.otoscopyRight === undefined ? entry.otoscopyRight : dto.otoscopyRight,
          otoscopyLeft: dto.otoscopyLeft === undefined ? entry.otoscopyLeft : dto.otoscopyLeft,
        };
        if (!next.otoscopyRight && !next.otoscopyLeft) {
          throw new BadRequestException('Escribe la otoscopia de al menos un oído');
        }

        const changes: PatientFieldChange[] = [];
        EDITABLE_FIELDS.forEach((field) => {
          if (entry[field] !== next[field]) {
            changes.push({ field, before: entry[field], after: next[field] });
          }
        });
        return { data: { ...next, updatedAt: now, updatedByUuid: actorUuid }, changes };
      },
    );

    if (changes.length > 0) {
      await this.recordActivity.execute({
        tenantUuid,
        patientUuid,
        actorUuid,
        action: PatientActivityAction.PHYSICAL_EXAM_UPDATED,
        detail: { changes },
      });
    }

    const [createdByName, updatedByName] = await Promise.all([
      saved.createdByUuid ? this.getOrCreateUser.execute(saved.createdByUuid, tenantUuid) : null,
      saved.updatedByUuid ? this.getOrCreateUser.execute(saved.updatedByUuid, tenantUuid) : null,
    ]);
    return { ...saved, createdByName, updatedByName, canEdit: true };
  }
}
