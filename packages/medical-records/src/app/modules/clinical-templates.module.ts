import { Module } from '@nestjs/common';
import { ClinicalTemplateController } from '../controllers/clinical-template.controller';
import { ClinicalTemplateStorage } from '@medical-records/infrastructure/adapters/clinicalTemplateRepository/clinical-template.storage';
import { PatientQuestionnaireEntryStorage } from '@medical-records/infrastructure/adapters/patientQuestionnaireEntryRepository/patient-questionnaire-entry.storage';
import {
  CreateClinicalTemplateUseCase,
  FindAllClinicalTemplatesUseCase,
  FindClinicalTemplateBySpecialityUseCase,
  FindAllClinicalTemplatesBySpecialityUseCase,
  UpdateClinicalTemplateUseCase,
  DeleteClinicalTemplateUseCase,
} from '@medical-records/domain/use-cases/clinical-templates';

const CONTROLLERS = [ClinicalTemplateController];
const USE_CASES = [
  CreateClinicalTemplateUseCase,
  FindAllClinicalTemplatesUseCase,
  FindClinicalTemplateBySpecialityUseCase,
  FindAllClinicalTemplatesBySpecialityUseCase,
  UpdateClinicalTemplateUseCase,
  DeleteClinicalTemplateUseCase,
];
// El storage de registros se provee aquí también (PrismaModule es global) para no
// crear un ciclo con PatientQuestionnaireEntriesModule, que importa este módulo.
const STORAGES = [ClinicalTemplateStorage];

@Module({
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES, PatientQuestionnaireEntryStorage],
  exports: [...STORAGES],
})
export class ClinicalTemplatesModule {}
