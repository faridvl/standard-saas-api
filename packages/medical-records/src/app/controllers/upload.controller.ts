import {
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard, CurrentUser, JwtPayload, StorageService, imageAndPdfFilter } from '@project/core';

const UPLOAD_OPTIONS = {
  storage: memoryStorage(),
  fileFilter: imageAndPdfFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
};

@Controller('upload')
@UseGuards(AuthGuard)
export class UploadController {
  constructor(private readonly storageService: StorageService) {}

  @Post('patients/:uuid/audiometrias')
  @UseInterceptors(FileInterceptor('file', UPLOAD_OPTIONS))
  async uploadAudiometry(
    @Param('uuid') patientUuid: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const url = await this.storageService.upload(
      'medical_records',
      currentUser.tenantUuid,
      'audiometrias',
      file,
      patientUuid,
    );
    return { url };
  }

  @Post('patients/:uuid/imagenes')
  @UseInterceptors(FileInterceptor('file', UPLOAD_OPTIONS))
  async uploadImage(
    @Param('uuid') patientUuid: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const url = await this.storageService.upload(
      'medical_records',
      currentUser.tenantUuid,
      'imagenes',
      file,
      patientUuid,
    );
    return { url };
  }

  @Post('patients/:uuid/informes')
  @UseInterceptors(FileInterceptor('file', UPLOAD_OPTIONS))
  async uploadReport(
    @Param('uuid') patientUuid: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const url = await this.storageService.upload(
      'medical_records',
      currentUser.tenantUuid,
      'informes',
      file,
      patientUuid,
    );
    return { url };
  }
}
