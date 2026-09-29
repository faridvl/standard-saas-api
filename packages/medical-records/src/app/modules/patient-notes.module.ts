import { Module } from '@nestjs/common';
import { PatientActivityModule } from './patient-activity.module';
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
  imports: [UsersModule, PatientActivityModule],
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class PatientNotesModule {}
