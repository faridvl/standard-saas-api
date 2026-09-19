import { Module } from '@nestjs/common';
import { MedicalControlController } from '../controllers/medical-control.controller';
import { MedicalControlStorage } from '@medical-records/infrastructure/adapters/controlRepository/medical-control.storage';
import {
  CreateMedicalControlUseCase,
  FindAllMedicalControlsUseCase,
  FindOneMedicalControlUseCase,
  AddCorrectionNoteUseCase,
} from '@medical-records/domain/use-cases/medical-control';

const CONTROLLERS = [MedicalControlController];
const USE_CASES = [
  CreateMedicalControlUseCase,
  FindAllMedicalControlsUseCase,
  FindOneMedicalControlUseCase,
  AddCorrectionNoteUseCase,
];
const STORAGES = [MedicalControlStorage];

@Module({
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class MedicalControlModule {}
