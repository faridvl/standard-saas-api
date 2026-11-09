import { Module } from '@nestjs/common';
import { PatientActivityModule } from './patient-activity.module';
import { PatientPhysicalExamModule } from './patient-physical-exam.module';
import { PatientBackgroundStorage } from '@medical-records/infrastructure/adapters/patientBackgroundRepository/patient-background.storage';
import {
  FindPatientBackgroundUseCase,
  UpsertPatientBackgroundUseCase,
} from '@medical-records/domain/use-cases/patient-background';

const USE_CASES = [FindPatientBackgroundUseCase, UpsertPatientBackgroundUseCase];
const STORAGES = [PatientBackgroundStorage];

@Module({
  imports: [PatientActivityModule, PatientPhysicalExamModule],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...USE_CASES, ...STORAGES],
})
export class PatientBackgroundModule {}
