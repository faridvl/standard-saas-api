import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors, UsePipes } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DocumentCategory } from '@prisma/client';
import { AuthGuard, CurrentUser, JwtPayload, StorageService, ZodValidationPipe, imageAndPdfFilter } from '@project/core';
import { RenamePatientDocumentDto, RenamePatientDocumentSchema } from '@medical-records/app/dtos/patient-document.dto';
import { FindPatientDocumentsUseCase } from '@medical-records/domain/use-cases/patient-documents/find-patient-documents.use-case';
import { DeletePatientDocumentUseCase } from '@medical-records/domain/use-cases/patient-documents/delete-patient-document.use-case';
import { CreatePatientDocumentUseCase } from '@medical-records/domain/use-cases/patient-documents/create-patient-document.use-case';
import { RenamePatientDocumentUseCase } from '@medical-records/domain/use-cases/patient-documents/rename-patient-document.use-case';

const UPLOAD_OPTIONS = {
  storage: memoryStorage(),
  fileFilter: imageAndPdfFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
};

@Controller('patients/:patientUuid/documents')
@UseGuards(AuthGuard)
export class PatientDocumentController {
  constructor(
    private readonly findUseCase: FindPatientDocumentsUseCase,
    private readonly createUseCase: CreatePatientDocumentUseCase,
    private readonly deleteUseCase: DeletePatientDocumentUseCase,
    private readonly renameUseCase: RenamePatientDocumentUseCase,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  async findAll(
    @Param('patientUuid') patientUuid: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.findUseCase.execute(patientUuid, user.tenantUuid);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', UPLOAD_OPTIONS))
  async upload(
    @Param('patientUuid') patientUuid: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
    @Body('category') category: string = DocumentCategory.OTHER,
  ) {
    const url = await this.storageService.upload('medical_records', user.tenantUuid, 'documentos', file, patientUuid);
    return await this.createUseCase.execute({
      patientUuid,
      tenantUuid: user.tenantUuid,
      originalName: file.originalname,
      url,
      category,
      size: file.size,
      uploadedByUuid: user.sub,
    });
  }

  @Patch(':documentUuid')
  @UsePipes(new ZodValidationPipe(RenamePatientDocumentSchema))
  async rename(
    @Param('documentUuid') documentUuid: string,
    @Body() dto: RenamePatientDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.renameUseCase.execute(documentUuid, user.tenantUuid, dto.originalName);
  }

  @Delete(':documentUuid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('documentUuid') documentUuid: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.deleteUseCase.execute(documentUuid, user.tenantUuid);
  }
}
