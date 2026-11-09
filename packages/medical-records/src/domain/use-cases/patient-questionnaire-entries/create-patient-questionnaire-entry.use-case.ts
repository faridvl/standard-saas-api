import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PatientQuestionnaireEntryStorage } from '@medical-records/infrastructure/adapters/patientQuestionnaireEntryRepository/patient-questionnaire-entry.storage';
import { ClinicalTemplateStorage } from '@medical-records/infrastructure/adapters/clinicalTemplateRepository/clinical-template.storage';
import { CreatePatientQuestionnaireEntryDto } from '@medical-records/app/dtos/patient-questionnaire-entry.dto';
import { PatientQuestionnaireEntryEntity } from '@medical-records/domain/entities/patient-questionnaire-entry.entity';
import { QUESTIONNAIRE_SPECIALITY } from '@medical-records/domain/policies/clinical-history-template.policy';
import { assertAnswersMatchFields } from '@medical-records/domain/utils/questionnaire-answers.util';
import { canEditQuestionnaireEntry } from '@medical-records/domain/utils/questionnaire-entry-edit.util';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

@Injectable()
export class CreatePatientQuestionnaireEntryUseCase {
  constructor(
    private readonly storage: PatientQuestionnaireEntryStorage,
    private readonly templateStorage: ClinicalTemplateStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    patientUuid: string,
    tenantUuid: string,
    actorUuid: string,
    dto: CreatePatientQuestionnaireEntryDto,
    now: Date = new Date(),
  ): Promise<PatientQuestionnaireEntryEntity> {
    if (!(await this.storage.patientExists(patientUuid, tenantUuid, { includeDeleted: false }))) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const template = await this.templateStorage.findByUuid(dto.templateUuid, tenantUuid);
    if (!template) {
      throw new NotFoundException('Sección no encontrada');
    }
    if (template.speciality !== QUESTIONNAIRE_SPECIALITY) {
      throw new BadRequestException('La plantilla no es una sección de preguntas');
    }

    assertAnswersMatchFields(template.fields, dto.answers);

    const saved = await this.storage.create({
      patientUuid,
      templateUuid: template.uuid,
      templateSnapshot: { name: template.name, fields: template.fields },
      answers: dto.answers,
      createdByUuid: actorUuid,
    });

    // Sin las respuestas: son datos de salud y la bitácora la ve más gente.
    await this.recordActivity.execute({
      tenantUuid,
      patientUuid,
      actorUuid,
      action: PatientActivityAction.QUESTIONNAIRE_FILLED,
      detail: { templateUuid: template.uuid, templateName: template.name },
    });

    const createdByName = await this.getOrCreateUser.execute(actorUuid, tenantUuid);
    return {
      ...saved,
      createdByName,
      updatedByName: null,
      canEdit: canEditQuestionnaireEntry(saved.createdAt, now),
    };
  }
}
