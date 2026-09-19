import { Injectable, NotFoundException } from '@nestjs/common';
import { ClinicalTemplateStorage } from '@medical-records/infrastructure/adapters/clinicalTemplateRepository/clinical-template.storage';
import { ClinicalTemplateEntity } from '@medical-records/domain/entities/clinical-template.entity';

@Injectable()
export class FindClinicalTemplateBySpecialityUseCase {
  constructor(private readonly storage: ClinicalTemplateStorage) {}

  async execute(tenantUuid: string, speciality: string): Promise<ClinicalTemplateEntity> {
    const template = await this.storage.findBySpeciality(tenantUuid, speciality);
    if (!template) {
      throw new NotFoundException(
        `No se encontró una plantilla para la especialidad "${speciality}"`,
      );
    }
    return template;
  }
}
