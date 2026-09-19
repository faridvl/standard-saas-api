import { Module } from '@nestjs/common';
import { PatientBackgroundStorage } from '@medical-records/infrastructure/adapters/patientBackgroundRepository/patient-background.storage';
import {
  FindPatientBackgroundUseCase,
  UpsertPatientBackgroundUseCase,
} from '@medical-records/domain/use-cases/patient-background';

const USE_CASES = [FindPatientBackgroundUseCase, UpsertPatientBackgroundUseCase];
const STORAGES = [PatientBackgroundStorage];

@Module({
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class PatientBackgroundModule {}
