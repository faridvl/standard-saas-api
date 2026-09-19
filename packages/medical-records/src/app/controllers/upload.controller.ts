import {
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DocumentCategory } from '@prisma/client';
import { AuthGuard, CurrentUser, JwtPayload, StorageService, imageAndPdfFilter } from '@project/core';
import { CreatePatientDocumentUseCase } from '@medical-records/domain/use-cases/patient-documents/create-patient-document.use-case';
import { PatientDocumentWithUploader } from '@medical-records/domain/use-cases/patient-documents/find-patient-documents.use-case';

const UPLOAD_OPTIONS = {
  storage: memoryStorage(),
  fileFilter: imageAndPdfFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
};

@Controller('upload')
@UseGuards(AuthGuard)
export class UploadController {
  constructor(
    private readonly storageService: StorageService,
    private readonly createDocumentUseCase: CreatePatientDocumentUseCase,
  ) {}

  private async uploadAndPersist(
    patientUuid: string,
    tenantUuid: string,
    uploadedByUuid: string,
    tipo: string,
    category: string,
    file: Express.Multer.File,
  ): Promise<PatientDocumentWithUploader> {
    const url = await this.storageService.upload('medical_records', tenantUuid, tipo, file, patientUuid);
    const document = await this.createDocumentUseCase.execute({
      patientUuid,
      tenantUuid,
      originalName: file.originalname,
      url,
      category,
      size: file.size,
      uploadedByUuid,
    });
    return document;
  }

  @Post('patients/:uuid/audiometrias')
  @UseInterceptors(FileInterceptor('file', UPLOAD_OPTIONS))
  async uploadAudiometry(
    @Param('uuid') patientUuid: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: JwtPayload,
    @Body('category') category: string = DocumentCategory.EXTERNAL_TEST,
  ): Promise<PatientDocumentWithUploader> {
    return await this.uploadAndPersist(patientUuid, currentUser.tenantUuid, currentUser.sub, 'audiometrias', category, file);
  }

  @Post('patients/:uuid/imagenes')
  @UseInterceptors(FileInterceptor('file', UPLOAD_OPTIONS))
  async uploadImage(
    @Param('uuid') patientUuid: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: JwtPayload,
    @Body('category') category: string = DocumentCategory.OTHER,
  ): Promise<PatientDocumentWithUploader> {
    return await this.uploadAndPersist(patientUuid, currentUser.tenantUuid, currentUser.sub, 'imagenes', category, file);
  }

  @Post('patients/:uuid/informes')
  @UseInterceptors(FileInterceptor('file', UPLOAD_OPTIONS))
  async uploadReport(
    @Param('uuid') patientUuid: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: JwtPayload,
    @Body('category') category: string = DocumentCategory.OTHER,
  ): Promise<PatientDocumentWithUploader> {
    return await this.uploadAndPersist(patientUuid, currentUser.tenantUuid, currentUser.sub, 'informes', category, file);
  }
}
