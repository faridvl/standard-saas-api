import { BadRequestException, Injectable } from '@nestjs/common';
import { ClinicalTemplateStorage } from '@medical-records/infrastructure/adapters/clinicalTemplateRepository/clinical-template.storage';
import { UpdateClinicalTemplateDto } from '@medical-records/app/dtos/clinical-template.dto';
import { ClinicalTemplateEntity } from '@medical-records/domain/entities/clinical-template.entity';
import {
  assertCanEditTemplate,
  CLINICAL_HISTORY_SPECIALITY,
  QUESTIONNAIRE_SPECIALITY,
} from '@medical-records/domain/policies/clinical-history-template.policy';
import { assertValidQuestionnaireTemplate } from '@medical-records/domain/utils/questionnaire-template.util';

const LOCKED_SPECIALITIES = [CLINICAL_HISTORY_SPECIALITY, QUESTIONNAIRE_SPECIALITY];

@Injectable()
export class UpdateClinicalTemplateUseCase {
  constructor(private readonly storage: ClinicalTemplateStorage) {}

  async execute(
    uuid: string,
    tenantUuid: string,
    dto: UpdateClinicalTemplateDto,
    role?: string | null,
  ): Promise<ClinicalTemplateEntity> {
    const existing = await this.storage.findByUuid(uuid, tenantUuid);
    assertCanEditTemplate(existing?.speciality, role);
    assertCanEditTemplate(dto.speciality, role);

    // Pasar una sección a otra speciality la sacaría de las comprobaciones de borrado
    // y de acceso; convertir otra plantilla en estas pisaría la historia clínica.
    const isChangingSpeciality =
      dto.speciality !== undefined && dto.speciality !== existing?.speciality;
    if (
      isChangingSpeciality &&
      (LOCKED_SPECIALITIES.includes(dto.speciality ?? '') ||
        LOCKED_SPECIALITIES.includes(existing?.speciality ?? ''))
    ) {
      throw new BadRequestException('No se puede cambiar el tipo de esta sección');
    }

    if (existing?.speciality === QUESTIONNAIRE_SPECIALITY) {
      assertValidQuestionnaireTemplate(dto);
    }
    return await this.storage.update(uuid, tenantUuid, dto);
  }
}
