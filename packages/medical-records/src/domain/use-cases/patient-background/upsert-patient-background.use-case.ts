import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientBackgroundStorage } from '@medical-records/infrastructure/adapters/patientBackgroundRepository/patient-background.storage';
import { UpsertPatientBackgroundDto } from '@medical-records/app/dtos/patient-background.dto';
import { PatientBackgroundEntity } from '@medical-records/domain/entities/patient-background.entity';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { UpsertPatientPhysicalExamUseCase } from '@medical-records/domain/use-cases/patient-physical-exam';
import { PatientPhysicalExamWriteData } from '@medical-records/domain/entities/patient-physical-exam.entity';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

const LEGACY_OTOSCOPY_FIELDS = ['otoscopyRight', 'otoscopyLeft'] as const;

function legacyOtoscopyFrom(answers: UpsertPatientBackgroundDto['answers']): PatientPhysicalExamWriteData {
  const result: PatientPhysicalExamWriteData = {};
  LEGACY_OTOSCOPY_FIELDS.forEach((field) => {
    const answer = answers?.[field];
    if (typeof answer === 'string') result[field] = answer;
  });
  return result;
}

@Injectable()
export class UpsertPatientBackgroundUseCase {
  constructor(
    private readonly storage: PatientBackgroundStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
    private readonly upsertPhysicalExam: UpsertPatientPhysicalExamUseCase,
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
    // Lo que no viene no se toca; solo un null explícito limpia el campo.
    const saved = await this.storage.upsert(patientUuid, actorUuid, dto);

    // Compatibilidad con el front anterior, que mandaba la otoscopia dentro de las respuestas.
    const legacyPhysicalExam = legacyOtoscopyFrom(dto.answers);
    if (Object.keys(legacyPhysicalExam).length > 0) {
      await this.upsertPhysicalExam.execute(patientUuid, tenantUuid, actorUuid, legacyPhysicalExam);
    }

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
