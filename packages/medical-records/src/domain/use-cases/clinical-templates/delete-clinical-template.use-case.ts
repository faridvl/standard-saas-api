import { Injectable } from '@nestjs/common';
import { assertCanEditTemplate } from '@medical-records/domain/policies/clinical-history-template.policy';
import { ClinicalTemplateStorage } from '@medical-records/infrastructure/adapters/clinicalTemplateRepository/clinical-template.storage';

@Injectable()
export class DeleteClinicalTemplateUseCase {
  constructor(private readonly storage: ClinicalTemplateStorage) {}

  async execute(
    uuid: string,
    tenantUuid: string,
    role?: string | null,
  ): Promise<{ success: boolean }> {
    const existing = await this.storage.findByUuid(uuid, tenantUuid);
    assertCanEditTemplate(existing?.speciality, role);
    await this.storage.delete(uuid, tenantUuid);
    return { success: true };
  }
}
