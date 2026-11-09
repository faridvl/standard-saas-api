import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@project/core';
import { AccessGuard } from '@medical-records/app/guards/access.guard';
import { ClinicalAccess } from '@medical-records/app/decorators/access.decorators';
import { AudiometryTypeItem } from '@medical-records/domain/entities/patient-audiometry-entry.entity';
import { FindAudiometryTypesUseCase } from '@medical-records/domain/use-cases/patient-audiometry-entries';

/** Tipos de audiometría activos para el selector; mismo acceso que las audiometrías. */
@Controller('audiometry-types')
@UseGuards(AuthGuard, AccessGuard)
@ClinicalAccess()
export class AudiometryTypeController {
  constructor(private readonly findAllUseCase: FindAudiometryTypesUseCase) {}

  @Get()
  async findAll(): Promise<AudiometryTypeItem[]> {
    return await this.findAllUseCase.execute();
  }
}
