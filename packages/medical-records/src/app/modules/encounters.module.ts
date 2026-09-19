import { Module } from '@nestjs/common';
import { EncounterController } from '../controllers/encounter.controller';
import { EncounterStorage } from '@medical-records/infrastructure/adapters/encounterRepository/encounter.storage';
import {
  CreateEncounterUseCase,
  FindByPatientEncounterUseCase,
  FindOneEncounterUseCase,
  CloseEncounterUseCase,
} from '@medical-records/domain/use-cases/encounters';

const CONTROLLERS = [EncounterController];
const USE_CASES = [
  CreateEncounterUseCase,
  FindByPatientEncounterUseCase,
  FindOneEncounterUseCase,
  CloseEncounterUseCase,
];
const STORAGES = [EncounterStorage];

@Module({
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class EncountersModule {}
