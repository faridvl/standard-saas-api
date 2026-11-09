import { Controller, Get, SetMetadata, UseGuards } from '@nestjs/common';
import { AuthGuard, RolesGuard } from '@project/core';
import {
  CLINICAL_ACCESS_ROLES,
  ROLES_METADATA_KEY,
} from '@medical-records/domain/policies/clinical-access.policy';
import { AudiometryTypeItem } from '@medical-records/domain/entities/patient-audiometry-entry.entity';
import { FindAudiometryTypesUseCase } from '@medical-records/domain/use-cases/patient-audiometry-entries';

/** Tipos de audiometría activos para el selector; mismo acceso que las audiometrías. */
@Controller('audiometry-types')
@UseGuards(AuthGuard, RolesGuard)
@SetMetadata(ROLES_METADATA_KEY, CLINICAL_ACCESS_ROLES)
export class AudiometryTypeController {
  constructor(private readonly findAllUseCase: FindAudiometryTypesUseCase) {}

  @Get()
  async findAll(): Promise<AudiometryTypeItem[]> {
    return await this.findAllUseCase.execute();
  }
}
