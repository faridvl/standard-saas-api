import { Body, Controller, Get, Param, Post, Put, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { AccessGuard } from '@medical-records/app/guards/access.guard';
import { AnyLevel, MinLevel } from '@medical-records/app/decorators/access.decorators';
import { AccessLevel } from '@medical-records/domain/policies/access.policy';
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
@UseGuards(AuthGuard, AccessGuard)
@AnyLevel()
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
  @MinLevel(AccessLevel.ADMIN)
  @UsePipes(new ZodValidationPipe(DocumentTemplateBodySchema))
  async create(
    @Body() dto: DocumentTemplateBodyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<DocumentTemplateEntity> {
    return await this.createUseCase.execute(user.tenantUuid, user.sub, dto);
  }

  @Put(':uuid')
  @MinLevel(AccessLevel.ADMIN)
  @UsePipes(new ZodValidationPipe(DocumentTemplateBodySchema))
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: DocumentTemplateBodyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<DocumentTemplateEntity> {
    return await this.updateUseCase.execute(uuid, user.tenantUuid, user.sub, dto);
  }
}
