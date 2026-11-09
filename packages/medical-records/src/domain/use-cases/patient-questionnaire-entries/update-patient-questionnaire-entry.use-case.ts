import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PatientQuestionnaireEntryStorage } from '@medical-records/infrastructure/adapters/patientQuestionnaireEntryRepository/patient-questionnaire-entry.storage';
import { UpdatePatientQuestionnaireEntryDto } from '@medical-records/app/dtos/patient-questionnaire-entry.dto';
import { PatientQuestionnaireEntryEntity } from '@medical-records/domain/entities/patient-questionnaire-entry.entity';
import { assertAnswersMatchFields } from '@medical-records/domain/utils/questionnaire-answers.util';
import { canEditQuestionnaireEntry } from '@medical-records/domain/utils/questionnaire-entry-edit.util';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

@Injectable()
export class UpdatePatientQuestionnaireEntryUseCase {
  constructor(
    private readonly storage: PatientQuestionnaireEntryStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    patientUuid: string,
    entryUuid: string,
    tenantUuid: string,
    actorUuid: string,
    dto: UpdatePatientQuestionnaireEntryDto,
    now: Date = new Date(),
  ): Promise<PatientQuestionnaireEntryEntity> {
    if (!(await this.storage.patientExists(patientUuid, tenantUuid, { includeDeleted: false }))) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const entry = await this.storage.findByUuid(entryUuid, patientUuid);
    if (!entry) {
      throw new NotFoundException('Registro no encontrado');
    }

    if (!canEditQuestionnaireEntry(entry.createdAt, now)) {
      throw new ConflictException(
        'Este registro ya no se puede corregir: solo se corrige el mismo día en que se llenó.',
      );
    }

    // Contra las preguntas con las que se llenó, no contra la plantilla actual.
    assertAnswersMatchFields(entry.templateSnapshot.fields, dto.answers);

    const saved = await this.storage.update(entry.uuid, tenantUuid, {
      answers: dto.answers,
      updatedAt: now,
      updatedByUuid: actorUuid,
    });

    // Sin las respuestas: son datos de salud y la bitácora la ve más gente.
    await this.recordActivity.execute({
      tenantUuid,
      patientUuid,
      actorUuid,
      action: PatientActivityAction.QUESTIONNAIRE_CORRECTED,
      detail: { templateUuid: entry.templateUuid, templateName: entry.templateSnapshot.name },
    });

    const [createdByName, updatedByName] = await Promise.all([
      this.getOrCreateUser.execute(saved.createdByUuid, tenantUuid),
      this.getOrCreateUser.execute(actorUuid, tenantUuid),
    ]);
    return { ...saved, createdByName, updatedByName, canEdit: true };
  }
}
