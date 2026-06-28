import { Injectable } from '@nestjs/common';
import { ClinicalTemplateStorage } from '@medical-records/infrastructure/adapters/clinicalTemplateRepository/clinical-template.storage';
import { CreateClinicalTemplateDto } from '@medical-records/app/dtos/clinical-template.dto';

@Injectable()
export class CreateClinicalTemplateUseCase {
  constructor(private readonly storage: ClinicalTemplateStorage) {}

  async execute(tenantUuid: string, dto: CreateClinicalTemplateDto) {
    return await this.storage.create(tenantUuid, dto);
  }
}
