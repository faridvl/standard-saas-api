import { Injectable } from '@nestjs/common';
import { DocumentTemplateSummary } from '@medical-records/domain/entities/document-template.entity';
import { DocumentTemplateStorage } from '@medical-records/infrastructure/adapters/documentTemplateRepository/document-template.storage';

@Injectable()
export class FindDocumentTemplatesUseCase {
  constructor(private readonly storage: DocumentTemplateStorage) {}

  async execute(tenantUuid: string): Promise<DocumentTemplateSummary[]> {
    return await this.storage.findAll(tenantUuid);
  }
}
