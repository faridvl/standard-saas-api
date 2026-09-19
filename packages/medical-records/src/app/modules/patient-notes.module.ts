import { Module } from '@nestjs/common';
import { PatientNoteController } from '../controllers/patient-note.controller';
import { PatientNoteStorage } from '@medical-records/infrastructure/adapters/patientNoteRepository/patient-note.storage';
import {
  CreatePatientNoteUseCase,
  FindPatientNotesUseCase,
} from '@medical-records/domain/use-cases/patient-notes';
import { UsersModule } from './users.module';

const CONTROLLERS = [PatientNoteController];
const USE_CASES = [CreatePatientNoteUseCase, FindPatientNotesUseCase];
const STORAGES = [PatientNoteStorage];

@Module({
  imports: [UsersModule],
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class PatientNotesModule {}
