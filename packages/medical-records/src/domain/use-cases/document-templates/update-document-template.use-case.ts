import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentTemplateBodyDto } from '@medical-records/app/dtos/document-template.dto';
import { DocumentTemplateEntity } from '@medical-records/domain/entities/document-template.entity';
import { DocumentTemplateStorage } from '@medical-records/infrastructure/adapters/documentTemplateRepository/document-template.storage';
import { prepareDocumentTemplateWrite } from './document-template-write.util';

const NOT_FOUND_MESSAGE = 'Plantilla de documento no encontrada';

@Injectable()
export class UpdateDocumentTemplateUseCase {
  constructor(private readonly storage: DocumentTemplateStorage) {}

  async execute(
    uuid: string,
    tenantUuid: string,
    actorUuid: string,
    dto: DocumentTemplateBodyDto,
  ): Promise<DocumentTemplateEntity> {
    if (!(await this.storage.findByUuid(uuid, tenantUuid))) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }
    const data = await prepareDocumentTemplateWrite(this.storage, tenantUuid, dto, uuid);
    const updated = await this.storage.update(uuid, tenantUuid, actorUuid, data);
    if (!updated) throw new NotFoundException(NOT_FOUND_MESSAGE);
    return updated;
  }
}
