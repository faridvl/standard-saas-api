import { Module } from '@nestjs/common';
import { PatientContactController } from '../controllers/patient-contact.controller';
import { PatientContactStorage } from '@medical-records/infrastructure/adapters/patientContactRepository/patient-contact.storage';
import {
  CreatePatientContactUseCase,
  FindPatientContactsUseCase,
  DeletePatientContactUseCase,
  SyncPatientContactsUseCase,
} from '@medical-records/domain/use-cases/patient-contacts';

const CONTROLLERS = [PatientContactController];
const USE_CASES = [
  CreatePatientContactUseCase,
  FindPatientContactsUseCase,
  DeletePatientContactUseCase,
  SyncPatientContactsUseCase,
];
const STORAGES = [PatientContactStorage];

@Module({
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class PatientContactsModule {}
