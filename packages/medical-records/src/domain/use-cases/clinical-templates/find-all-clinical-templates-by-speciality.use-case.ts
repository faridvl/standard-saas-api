import { Injectable } from '@nestjs/common';
import { ClinicalTemplateStorage } from '@medical-records/infrastructure/adapters/clinicalTemplateRepository/clinical-template.storage';

@Injectable()
export class FindAllClinicalTemplatesBySpecialityUseCase {
  constructor(private readonly storage: ClinicalTemplateStorage) {}

  async execute(tenantUuid: string, speciality: string) {
    return await this.storage.findAllBySpeciality(tenantUuid, speciality);
  }
}
