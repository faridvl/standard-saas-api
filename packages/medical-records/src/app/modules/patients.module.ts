import { Module } from '@nestjs/common';
import { PatientController } from '../controllers/patient.controllers';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { CreatePatientUseCase } from '@medical-records/domain/use-cases/create-patient.use-case';
import { GetPatientsUseCase } from '@medical-records/domain/use-cases/get-patients.use-case';
import { GetPatientByUuidUseCase } from '@medical-records/domain/use-cases/get-patient-by-uuid.use-case';
import { UpdatePatientUseCase } from '@medical-records/domain/use-cases/update-patient.use-case';
import { SoftDeletePatientUseCase } from '@medical-records/domain/use-cases/soft-delete-patient.use-case';
import { BulkImportPatientsUseCase } from '@medical-records/domain/use-cases/bulk-import-patients.use-case';
import { PatientContactsModule } from './patient-contacts.module';

const CONTROLLERS = [PatientController];
const USE_CASES = [
  CreatePatientUseCase,
  GetPatientsUseCase,
  GetPatientByUuidUseCase,
  UpdatePatientUseCase,
  SoftDeletePatientUseCase,
  BulkImportPatientsUseCase,
];
const STORAGES = [PatientStorage];

@Module({
  imports: [PatientContactsModule],
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class PatientsModule {}
