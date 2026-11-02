import { ConflictException, Injectable } from '@nestjs/common';
import {
  assertCanEditTemplate,
  QUESTIONNAIRE_SPECIALITY,
} from '@medical-records/domain/policies/clinical-history-template.policy';
import { ClinicalTemplateStorage } from '@medical-records/infrastructure/adapters/clinicalTemplateRepository/clinical-template.storage';
import { PatientQuestionnaireEntryStorage } from '@medical-records/infrastructure/adapters/patientQuestionnaireEntryRepository/patient-questionnaire-entry.storage';

@Injectable()
export class DeleteClinicalTemplateUseCase {
  constructor(
    private readonly storage: ClinicalTemplateStorage,
    private readonly entryStorage: PatientQuestionnaireEntryStorage,
  ) {}

  async execute(
    uuid: string,
    tenantUuid: string,
    role?: string | null,
  ): Promise<{ success: boolean }> {
    const existing = await this.storage.findByUuid(uuid, tenantUuid);
    assertCanEditTemplate(existing?.speciality, role);
    // Los registros guardan una copia de las preguntas, pero borrar la sección dejaría
    // el historial del paciente sin su origen.
    if (
      existing?.speciality === QUESTIONNAIRE_SPECIALITY &&
      (await this.entryStorage.countByTemplate(uuid)) > 0
    ) {
      throw new ConflictException(
        'La sección ya tiene registros de pacientes y no se puede borrar',
      );
    }
    await this.storage.delete(uuid, tenantUuid);
    return { success: true };
  }
}
