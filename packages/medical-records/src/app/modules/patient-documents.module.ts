import { Module } from '@nestjs/common';
import { PatientDocumentController } from '../controllers/patient-document.controller';
import { PatientDocumentStorage } from '@medical-records/infrastructure/adapters/patientDocumentRepository/patient-document.storage';
import {
  FindPatientDocumentsUseCase,
  CreatePatientDocumentUseCase,
  DeletePatientDocumentUseCase,
  RenamePatientDocumentUseCase,
} from '@medical-records/domain/use-cases/patient-documents';
import { UsersModule } from './users.module';

const CONTROLLERS = [PatientDocumentController];
const USE_CASES = [
  FindPatientDocumentsUseCase,
  CreatePatientDocumentUseCase,
  DeletePatientDocumentUseCase,
  RenamePatientDocumentUseCase,
];
const STORAGES = [PatientDocumentStorage];

@Module({
  imports: [UsersModule],
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES, ...USE_CASES],
})
export class PatientDocumentsModule {}
