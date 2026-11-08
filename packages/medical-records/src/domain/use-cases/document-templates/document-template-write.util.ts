import { BadRequestException, ConflictException } from '@nestjs/common';
import { DocumentTemplateBodyDto } from '@medical-records/app/dtos/document-template.dto';
import { DocumentTemplateWriteData } from '@medical-records/domain/entities/document-template.entity';
import {
  DOCUMENT_TEMPLATE_VARIABLES,
  findUnknownDocumentTemplateVariables,
} from '@medical-records/domain/types/document-template-variables';
import {
  DocumentTemplateStorage,
  DUPLICATE_DOCUMENT_TEMPLATE_MESSAGE,
} from '@medical-records/infrastructure/adapters/documentTemplateRepository/document-template.storage';

/** Valida las variables y el nombre repetido; devuelve lo que se guarda. */
export async function prepareDocumentTemplateWrite(
  storage: DocumentTemplateStorage,
  tenantUuid: string,
  dto: DocumentTemplateBodyDto,
  exceptUuid?: string,
): Promise<DocumentTemplateWriteData> {
  const unknown = findUnknownDocumentTemplateVariables(dto.content);
  if (unknown.length > 0) {
    const names = unknown.map((key) => `{{${key}}}`).join(', ');
    throw new BadRequestException(
      `El contenido usa variables desconocidas: ${names}. Las permitidas son: ${DOCUMENT_TEMPLATE_VARIABLES.join(', ')}`,
    );
  }
  if (await storage.nameExists(tenantUuid, dto.name, exceptUuid)) {
    throw new ConflictException(DUPLICATE_DOCUMENT_TEMPLATE_MESSAGE);
  }
  return {
    name: dto.name,
    description: dto.description ? dto.description : null,
    content: dto.content,
  };
}
