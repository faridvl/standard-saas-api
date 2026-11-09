import { Module } from '@nestjs/common';
import { PatientActivityModule } from './patient-activity.module';
import { PatientPhysicalExamStorage } from '@medical-records/infrastructure/adapters/patientPhysicalExamRepository/patient-physical-exam.storage';
import {
  FindPatientPhysicalExamUseCase,
  UpsertPatientPhysicalExamUseCase,
} from '@medical-records/domain/use-cases/patient-physical-exam';

const USE_CASES = [FindPatientPhysicalExamUseCase, UpsertPatientPhysicalExamUseCase];
const STORAGES = [PatientPhysicalExamStorage];

@Module({
  imports: [PatientActivityModule],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...USE_CASES, ...STORAGES],
})
export class PatientPhysicalExamModule {}
