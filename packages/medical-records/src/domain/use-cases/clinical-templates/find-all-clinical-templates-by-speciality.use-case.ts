import { Injectable } from '@nestjs/common';
import { ClinicalTemplateStorage } from '@medical-records/infrastructure/adapters/clinicalTemplateRepository/clinical-template.storage';
import { ClinicalTemplateEntity } from '@medical-records/domain/entities/clinical-template.entity';

@Injectable()
export class FindAllClinicalTemplatesBySpecialityUseCase {
  constructor(private readonly storage: ClinicalTemplateStorage) {}

  async execute(tenantUuid: string, speciality: string): Promise<ClinicalTemplateEntity[]> {
    return await this.storage.findAllBySpeciality(tenantUuid, speciality);
  }
}
