import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentTemplateEntity } from '@medical-records/domain/entities/document-template.entity';
import { DocumentTemplateStorage } from '@medical-records/infrastructure/adapters/documentTemplateRepository/document-template.storage';

@Injectable()
export class FindDocumentTemplateUseCase {
  constructor(private readonly storage: DocumentTemplateStorage) {}

  async execute(uuid: string, tenantUuid: string): Promise<DocumentTemplateEntity> {
    const template = await this.storage.findByUuid(uuid, tenantUuid);
    if (!template) throw new NotFoundException('Plantilla de documento no encontrada');
    return template;
  }
}
