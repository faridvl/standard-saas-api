import { Module } from '@nestjs/common';
import { DocumentTemplateController } from '../controllers/document-template.controller';
import { DocumentTemplateStorage } from '@medical-records/infrastructure/adapters/documentTemplateRepository/document-template.storage';
import {
  CreateDocumentTemplateUseCase,
  FindDocumentTemplatesUseCase,
  FindDocumentTemplateUseCase,
  UpdateDocumentTemplateUseCase,
} from '@medical-records/domain/use-cases/document-templates';

const CONTROLLERS = [DocumentTemplateController];
const USE_CASES = [
  CreateDocumentTemplateUseCase,
  FindDocumentTemplatesUseCase,
  FindDocumentTemplateUseCase,
  UpdateDocumentTemplateUseCase,
];
const STORAGES = [DocumentTemplateStorage];

@Module({
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class DocumentTemplatesModule {}
