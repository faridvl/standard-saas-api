import { Module } from '@nestjs/common';
import { StorageModule } from '@project/core';
import { UploadController } from '../controllers/upload.controller';
import { PatientDocumentsModule } from './patient-documents.module';

@Module({
  imports: [StorageModule, PatientDocumentsModule],
  controllers: [UploadController],
})
export class UploadModule {}
