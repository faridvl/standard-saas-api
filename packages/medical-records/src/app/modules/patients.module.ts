import { Module } from '@nestjs/common';
import { PatientActivityModule } from './patient-activity.module';
import { PatientController } from '../controllers/patient.controllers';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { CreatePatientUseCase } from '@medical-records/domain/use-cases/create-patient.use-case';
import { GetPatientsUseCase } from '@medical-records/domain/use-cases/get-patients.use-case';
import { GetPatientByUuidUseCase } from '@medical-records/domain/use-cases/get-patient-by-uuid.use-case';
import { UpdatePatientUseCase } from '@medical-records/domain/use-cases/update-patient.use-case';
import { UpdatePatientStatusUseCase } from '@medical-records/domain/use-cases/update-patient-status.use-case';
import { UpdatePatientFlagsUseCase } from '@medical-records/domain/use-cases/update-patient-flags.use-case';
import { UpdatePatientMaintenanceUseCase } from '@medical-records/domain/use-cases/update-patient-maintenance.use-case';
import { SoftDeletePatientUseCase } from '@medical-records/domain/use-cases/soft-delete-patient.use-case';
import { BulkImportPatientsUseCase } from '@medical-records/domain/use-cases/bulk-import-patients.use-case';
import { PatientContactsModule } from './patient-contacts.module';
import { BranchesModule } from './branches.module';
import { PatientBackgroundModule } from './patient-background.module';
import { PatientPhysicalExamModule } from './patient-physical-exam.module';
import { PatientLabShipmentsModule } from './patient-lab-shipments.module';

const CONTROLLERS = [PatientController];
const USE_CASES = [
  CreatePatientUseCase,
  GetPatientsUseCase,
  GetPatientByUuidUseCase,
  UpdatePatientUseCase,
  UpdatePatientStatusUseCase,
  UpdatePatientFlagsUseCase,
  UpdatePatientMaintenanceUseCase,
  SoftDeletePatientUseCase,
  BulkImportPatientsUseCase,
];
const STORAGES = [PatientStorage];

@Module({
  imports: [
    BranchesModule,
    PatientContactsModule,
    PatientBackgroundModule,
    PatientPhysicalExamModule,
    PatientActivityModule,
    PatientLabShipmentsModule,
  ],
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class PatientsModule {}
