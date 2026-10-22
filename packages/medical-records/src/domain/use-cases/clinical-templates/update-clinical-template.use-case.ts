import { Injectable } from '@nestjs/common';
import { ClinicalTemplateStorage } from '@medical-records/infrastructure/adapters/clinicalTemplateRepository/clinical-template.storage';
import { UpdateClinicalTemplateDto } from '@medical-records/app/dtos/clinical-template.dto';
import { ClinicalTemplateEntity } from '@medical-records/domain/entities/clinical-template.entity';
import { assertCanEditTemplate } from '@medical-records/domain/policies/clinical-history-template.policy';

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
    return await this.storage.update(uuid, tenantUuid, dto);
  }
}
