import { Module } from '@nestjs/common';
import { PatientActivityController } from '../controllers/patient-activity.controller';
import { PatientActivityStorage } from '@medical-records/infrastructure/adapters/patientActivityRepository/patient-activity.storage';
import {
  FindPatientActivityActorsUseCase,
  FindPatientActivityMonthsUseCase,
  FindPatientActivityUseCase,
  RecordPatientActivityUseCase,
  SummarizePatientActivityUseCase,
} from '@medical-records/domain/use-cases/patient-activity';
import { UsersModule } from './users.module';

const CONTROLLERS = [PatientActivityController];
const USE_CASES = [
  RecordPatientActivityUseCase,
  FindPatientActivityUseCase,
  FindPatientActivityActorsUseCase,
  FindPatientActivityMonthsUseCase,
  SummarizePatientActivityUseCase,
];
const STORAGES = [PatientActivityStorage];

/**
 * Los módulos de pacientes, contactos, notas, documentos y citas importan
 * este módulo para anotar sus acciones con RecordPatientActivityUseCase.
 */
@Module({
  imports: [UsersModule],
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [RecordPatientActivityUseCase],
})
export class PatientActivityModule {}
