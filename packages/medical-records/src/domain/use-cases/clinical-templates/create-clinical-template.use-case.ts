import { Injectable } from '@nestjs/common';
import { ClinicalTemplateStorage } from '@medical-records/infrastructure/adapters/clinicalTemplateRepository/clinical-template.storage';
import { CreateClinicalTemplateDto } from '@medical-records/app/dtos/clinical-template.dto';
import { ClinicalTemplateEntity } from '@medical-records/domain/entities/clinical-template.entity';
import { assertCanEditTemplate } from '@medical-records/domain/policies/clinical-history-template.policy';

@Injectable()
export class CreateClinicalTemplateUseCase {
  constructor(private readonly storage: ClinicalTemplateStorage) {}

  async execute(
    tenantUuid: string,
    dto: CreateClinicalTemplateDto,
    role?: string | null,
  ): Promise<ClinicalTemplateEntity> {
    assertCanEditTemplate(dto.speciality, role);
    return await this.storage.create(tenantUuid, dto);
  }
}
