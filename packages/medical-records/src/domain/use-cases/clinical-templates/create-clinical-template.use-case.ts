import { Injectable } from '@nestjs/common';
import { ClinicalTemplateStorage } from '@medical-records/infrastructure/adapters/clinicalTemplateRepository/clinical-template.storage';
import { CreateClinicalTemplateDto } from '@medical-records/app/dtos/clinical-template.dto';
import { ClinicalTemplateEntity } from '@medical-records/domain/entities/clinical-template.entity';
import { QUESTIONNAIRE_SPECIALITY } from '@medical-records/domain/policies/clinical-history-template.policy';
import { assertValidQuestionnaireTemplate } from '@medical-records/domain/utils/questionnaire-template.util';

@Injectable()
export class CreateClinicalTemplateUseCase {
  constructor(private readonly storage: ClinicalTemplateStorage) {}

  async execute(
    tenantUuid: string,
    dto: CreateClinicalTemplateDto,
  ): Promise<ClinicalTemplateEntity> {
    if (dto.speciality === QUESTIONNAIRE_SPECIALITY) {
      assertValidQuestionnaireTemplate(dto);
    }
    return await this.storage.create(tenantUuid, dto);
  }
}
