import { Module } from '@nestjs/common';
import { PatientActivityModule } from './patient-activity.module';
import { ClinicalTemplatesModule } from './clinical-templates.module';
import { UsersModule } from './users.module';
import { PatientQuestionnaireEntryController } from '../controllers/patient-questionnaire-entry.controller';
import { PatientQuestionnaireEntryStorage } from '@medical-records/infrastructure/adapters/patientQuestionnaireEntryRepository/patient-questionnaire-entry.storage';
import {
  CreatePatientQuestionnaireEntryUseCase,
  FindPatientQuestionnaireEntriesUseCase,
} from '@medical-records/domain/use-cases/patient-questionnaire-entries';

const CONTROLLERS = [PatientQuestionnaireEntryController];
const USE_CASES = [CreatePatientQuestionnaireEntryUseCase, FindPatientQuestionnaireEntriesUseCase];
const STORAGES = [PatientQuestionnaireEntryStorage];

@Module({
  imports: [UsersModule, PatientActivityModule, ClinicalTemplatesModule],
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class PatientQuestionnaireEntriesModule {}
