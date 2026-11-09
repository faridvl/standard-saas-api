import { Module } from '@nestjs/common';
import { PatientActivityModule } from './patient-activity.module';
import { UsersModule } from './users.module';
import { PatientOtoscopyEntryController } from '../controllers/patient-otoscopy-entry.controller';
import { PatientOtoscopyEntryStorage } from '@medical-records/infrastructure/adapters/patientOtoscopyEntryRepository/patient-otoscopy-entry.storage';
import {
  CreatePatientOtoscopyEntryUseCase,
  FindPatientOtoscopyEntriesUseCase,
  UpdatePatientOtoscopyEntryUseCase,
} from '@medical-records/domain/use-cases/patient-otoscopy-entries';

const CONTROLLERS = [PatientOtoscopyEntryController];
const USE_CASES = [
  CreatePatientOtoscopyEntryUseCase,
  FindPatientOtoscopyEntriesUseCase,
  UpdatePatientOtoscopyEntryUseCase,
];
const STORAGES = [PatientOtoscopyEntryStorage];

@Module({
  imports: [UsersModule, PatientActivityModule],
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class PatientOtoscopyEntriesModule {}
