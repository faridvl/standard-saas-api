import { Module } from '@nestjs/common';
import { UsersModule } from './users.module';
import { EquipmentModule } from './equipment.module';
import { AudiometryTypeController } from '../controllers/audiometry-type.controller';
import { PatientAudiometryEntryController } from '../controllers/patient-audiometry-entry.controller';
import { AudiometryTypeStorage } from '@medical-records/infrastructure/adapters/audiometryTypeRepository/audiometry-type.storage';
import { PatientAudiometryEntryStorage } from '@medical-records/infrastructure/adapters/patientAudiometryEntryRepository/patient-audiometry-entry.storage';
import {
  CreatePatientAudiometryEntryUseCase,
  FindAudiometryTypesUseCase,
  FindPatientAudiometryEntriesUseCase,
  FindPatientAudiometryEntryUseCase,
  InvalidatePatientAudiometryEntryUseCase,
} from '@medical-records/domain/use-cases/patient-audiometry-entries';

const CONTROLLERS = [PatientAudiometryEntryController, AudiometryTypeController];
const USE_CASES = [
  CreatePatientAudiometryEntryUseCase,
  FindPatientAudiometryEntriesUseCase,
  FindPatientAudiometryEntryUseCase,
  InvalidatePatientAudiometryEntryUseCase,
  FindAudiometryTypesUseCase,
];
const STORAGES = [PatientAudiometryEntryStorage, AudiometryTypeStorage];

@Module({
  imports: [UsersModule, EquipmentModule],
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class PatientAudiometryEntriesModule {}
