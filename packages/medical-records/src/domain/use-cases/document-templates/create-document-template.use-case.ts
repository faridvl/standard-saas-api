import { Injectable } from '@nestjs/common';
import { DocumentTemplateBodyDto } from '@medical-records/app/dtos/document-template.dto';
import { DocumentTemplateEntity } from '@medical-records/domain/entities/document-template.entity';
import { DocumentTemplateStorage } from '@medical-records/infrastructure/adapters/documentTemplateRepository/document-template.storage';
import { prepareDocumentTemplateWrite } from './document-template-write.util';

@Injectable()
export class CreateDocumentTemplateUseCase {
  constructor(private readonly storage: DocumentTemplateStorage) {}

  async execute(
    tenantUuid: string,
    actorUuid: string,
    dto: DocumentTemplateBodyDto,
  ): Promise<DocumentTemplateEntity> {
    const data = await prepareDocumentTemplateWrite(this.storage, tenantUuid, dto);
    return await this.storage.create(tenantUuid, actorUuid, data);
  }
}
