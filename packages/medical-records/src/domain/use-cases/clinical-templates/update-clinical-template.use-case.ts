import { Injectable } from '@nestjs/common';
import { ClinicalTemplateStorage } from '@medical-records/infrastructure/adapters/clinicalTemplateRepository/clinical-template.storage';
import { UpdateClinicalTemplateDto } from '@medical-records/app/dtos/clinical-template.dto';
import { ClinicalTemplateEntity } from '@medical-records/domain/entities/clinical-template.entity';

@Injectable()
export class UpdateClinicalTemplateUseCase {
  constructor(private readonly storage: ClinicalTemplateStorage) {}

  async execute(uuid: string, tenantUuid: string, dto: UpdateClinicalTemplateDto): Promise<ClinicalTemplateEntity> {
    return await this.storage.update(uuid, tenantUuid, dto);
  }
}
