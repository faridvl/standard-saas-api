import { Injectable } from '@nestjs/common';
import { DocumentTemplateSummary } from '@medical-records/domain/entities/document-template.entity';
import { DocumentTemplateStorage } from '@medical-records/infrastructure/adapters/documentTemplateRepository/document-template.storage';

// Orden alfabético en español sin depender de la collation de la base (acta antes que Zeta, Árbol con la A).
const TEMPLATE_SORT_LOCALE = 'es';

@Injectable()
export class FindDocumentTemplatesUseCase {
  constructor(private readonly storage: DocumentTemplateStorage) {}

  async execute(tenantUuid: string): Promise<DocumentTemplateSummary[]> {
    const templates = await this.storage.findAll(tenantUuid);
    return [...templates].sort((a, b) => a.name.localeCompare(b.name, TEMPLATE_SORT_LOCALE));
  }
}
