import { Injectable } from '@nestjs/common';
import { ClinicalTemplateStorage } from '@medical-records/infrastructure/adapters/clinicalTemplateRepository/clinical-template.storage';

@Injectable()
export class DeleteClinicalTemplateUseCase {
  constructor(private readonly storage: ClinicalTemplateStorage) {}

  async execute(uuid: string, tenantUuid: string): Promise<{ success: boolean }> {
    await this.storage.delete(uuid, tenantUuid);
    return { success: true };
  }
}
