import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  SetMetadata,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, RolesGuard, ZodValidationPipe } from '@project/core';
import {
  CLINICAL_ACCESS_ROLES,
  ROLES_METADATA_KEY,
} from '@medical-records/domain/policies/clinical-access.policy';
import {
  CreatePatientAudiometryEntryDto,
  CreatePatientAudiometryEntrySchema,
} from '@medical-records/app/dtos/patient-audiometry-entry.dto';
import {
  PatientAudiometryEntryEntity,
  PatientAudiometryEntrySummary,
} from '@medical-records/domain/entities/patient-audiometry-entry.entity';
import {
  CreatePatientAudiometryEntryUseCase,
  FindPatientAudiometryEntriesUseCase,
  FindPatientAudiometryEntryUseCase,
} from '@medical-records/domain/use-cases/patient-audiometry-entries';

/** Audiometrías guardadas por paciente: dato clínico, fuera del alcance de STAFF. Inmutables. */
@Controller('patients/:patientUuid/audiometry-entries')
@UseGuards(AuthGuard, RolesGuard)
@SetMetadata(ROLES_METADATA_KEY, CLINICAL_ACCESS_ROLES)
export class PatientAudiometryEntryController {
  constructor(
    private readonly createUseCase: CreatePatientAudiometryEntryUseCase,
    private readonly findAllUseCase: FindPatientAudiometryEntriesUseCase,
    private readonly findOneUseCase: FindPatientAudiometryEntryUseCase,
  ) {}

  @Get()
  async findAll(
    @Param('patientUuid') patientUuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientAudiometryEntrySummary[]> {
    return await this.findAllUseCase.execute(patientUuid, user.tenantUuid);
  }

  @Get(':entryUuid')
  async findOne(
    @Param('patientUuid') patientUuid: string,
    @Param('entryUuid') entryUuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientAudiometryEntryEntity> {
    return await this.findOneUseCase.execute(patientUuid, entryUuid, user.tenantUuid);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreatePatientAudiometryEntrySchema))
  async create(
    @Param('patientUuid') patientUuid: string,
    @Body() dto: CreatePatientAudiometryEntryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientAudiometryEntryEntity> {
    return await this.createUseCase.execute(patientUuid, user.tenantUuid, user.sub, dto);
  }
}
