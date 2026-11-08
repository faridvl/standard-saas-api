import { Module } from '@nestjs/common';
import { UsersModule } from './users.module';
import { PatientAudiometryEntryController } from '../controllers/patient-audiometry-entry.controller';
import { PatientAudiometryEntryStorage } from '@medical-records/infrastructure/adapters/patientAudiometryEntryRepository/patient-audiometry-entry.storage';
import {
  CreatePatientAudiometryEntryUseCase,
  FindPatientAudiometryEntriesUseCase,
  FindPatientAudiometryEntryUseCase,
} from '@medical-records/domain/use-cases/patient-audiometry-entries';

const CONTROLLERS = [PatientAudiometryEntryController];
const USE_CASES = [
  CreatePatientAudiometryEntryUseCase,
  FindPatientAudiometryEntriesUseCase,
  FindPatientAudiometryEntryUseCase,
];
const STORAGES = [PatientAudiometryEntryStorage];

@Module({
  imports: [UsersModule],
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class PatientAudiometryEntriesModule {}
