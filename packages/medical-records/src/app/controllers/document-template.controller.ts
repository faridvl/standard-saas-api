import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  SetMetadata,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, RolesGuard, ZodValidationPipe } from '@project/core';
import {
  CLINICAL_ACCESS_ROLES,
  ROLES_METADATA_KEY,
} from '@medical-records/domain/policies/clinical-access.policy';
import {
  DocumentTemplateBodyDto,
  DocumentTemplateBodySchema,
} from '@medical-records/app/dtos/document-template.dto';
import {
  DocumentTemplateEntity,
  DocumentTemplateSummary,
} from '@medical-records/domain/entities/document-template.entity';
import {
  CreateDocumentTemplateUseCase,
  FindDocumentTemplatesUseCase,
  FindDocumentTemplateUseCase,
  UpdateDocumentTemplateUseCase,
} from '@medical-records/domain/use-cases/document-templates';

// Ver las plantillas lo puede todo el que imprime documentos; crearlas o cambiarlas
// sigue la regla de las preguntas de la historia clínica: solo roles clínicos. Sin borrado.
@Controller('document-templates')
@UseGuards(AuthGuard)
export class DocumentTemplateController {
  constructor(
    private readonly createUseCase: CreateDocumentTemplateUseCase,
    private readonly findAllUseCase: FindDocumentTemplatesUseCase,
    private readonly findOneUseCase: FindDocumentTemplateUseCase,
    private readonly updateUseCase: UpdateDocumentTemplateUseCase,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload): Promise<DocumentTemplateSummary[]> {
    return await this.findAllUseCase.execute(user.tenantUuid);
  }

  @Get(':uuid')
  async findOne(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<DocumentTemplateEntity> {
    return await this.findOneUseCase.execute(uuid, user.tenantUuid);
  }

  @Post()
  @UseGuards(RolesGuard)
  @SetMetadata(ROLES_METADATA_KEY, CLINICAL_ACCESS_ROLES)
  @UsePipes(new ZodValidationPipe(DocumentTemplateBodySchema))
  async create(
    @Body() dto: DocumentTemplateBodyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<DocumentTemplateEntity> {
    return await this.createUseCase.execute(user.tenantUuid, user.sub, dto);
  }

  @Put(':uuid')
  @UseGuards(RolesGuard)
  @SetMetadata(ROLES_METADATA_KEY, CLINICAL_ACCESS_ROLES)
  @UsePipes(new ZodValidationPipe(DocumentTemplateBodySchema))
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: DocumentTemplateBodyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<DocumentTemplateEntity> {
    return await this.updateUseCase.execute(uuid, user.tenantUuid, user.sub, dto);
  }
}
