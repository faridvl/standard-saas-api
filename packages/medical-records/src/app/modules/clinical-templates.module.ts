import { Module } from '@nestjs/common';
import { ClinicalTemplateController } from '../controllers/clinical-template.controller';
import { ClinicalTemplateStorage } from '@medical-records/infrastructure/adapters/clinicalTemplateRepository/clinical-template.storage';
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
const STORAGES = [ClinicalTemplateStorage];

@Module({
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class ClinicalTemplatesModule {}
