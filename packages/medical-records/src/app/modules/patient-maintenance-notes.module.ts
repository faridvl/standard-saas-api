import { Module } from '@nestjs/common';
import { PatientActivityModule } from './patient-activity.module';
import { UsersModule } from './users.module';
import { PatientMaintenanceController } from '../controllers/patient-maintenance.controller';
import { PatientMaintenanceNoteStorage } from '@medical-records/infrastructure/adapters/patientMaintenanceNoteRepository/patient-maintenance-note.storage';
import {
  CreatePatientMaintenanceNoteUseCase,
  FindPatientMaintenancesUseCase,
} from '@medical-records/domain/use-cases/patient-maintenance-notes';

const CONTROLLERS = [PatientMaintenanceController];
const USE_CASES = [CreatePatientMaintenanceNoteUseCase, FindPatientMaintenancesUseCase];
const STORAGES = [PatientMaintenanceNoteStorage];

@Module({
  imports: [UsersModule, PatientActivityModule],
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class PatientMaintenanceNotesModule {}
