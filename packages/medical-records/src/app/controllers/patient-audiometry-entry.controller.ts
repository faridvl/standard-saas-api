import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { AccessGuard } from '@medical-records/app/guards/access.guard';
import {
  ClinicalAccess,
  RequiresSpecialty,
} from '@medical-records/app/decorators/access.decorators';
import { Specialty } from '@medical-records/domain/policies/access.policy';
import {
  CreatePatientAudiometryEntryDto,
  CreatePatientAudiometryEntrySchema,
  InvalidatePatientAudiometryEntryDto,
  InvalidatePatientAudiometryEntrySchema,
} from '@medical-records/app/dtos/patient-audiometry-entry.dto';
import {
  PatientAudiometryEntryEntity,
  PatientAudiometryEntrySummary,
} from '@medical-records/domain/entities/patient-audiometry-entry.entity';
import {
  CreatePatientAudiometryEntryUseCase,
  FindPatientAudiometryEntriesUseCase,
  FindPatientAudiometryEntryUseCase,
  InvalidatePatientAudiometryEntryUseCase,
} from '@medical-records/domain/use-cases/patient-audiometry-entries';

/** Audiometrías guardadas por paciente: dato clínico, fuera del alcance de STAFF. Inmutables; solo se pueden marcar como mal hechas. */
@Controller('patients/:patientUuid/audiometry-entries')
@UseGuards(AuthGuard, AccessGuard)
@ClinicalAccess()
export class PatientAudiometryEntryController {
  constructor(
    private readonly createUseCase: CreatePatientAudiometryEntryUseCase,
    private readonly findAllUseCase: FindPatientAudiometryEntriesUseCase,
    private readonly findOneUseCase: FindPatientAudiometryEntryUseCase,
    private readonly invalidateUseCase: InvalidatePatientAudiometryEntryUseCase,
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
  @RequiresSpecialty(Specialty.AUDIOLOGY)
  @UsePipes(new ZodValidationPipe(CreatePatientAudiometryEntrySchema))
  async create(
    @Param('patientUuid') patientUuid: string,
    @Body() dto: CreatePatientAudiometryEntryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientAudiometryEntryEntity> {
    return await this.createUseCase.execute(patientUuid, user.tenantUuid, user.sub, dto);
  }

  /** Marca definitiva con motivo: no hay ruta para quitarla. Una ya marcada responde 409. */
  @Post(':entryUuid/invalidate')
  @RequiresSpecialty(Specialty.AUDIOLOGY)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(InvalidatePatientAudiometryEntrySchema))
  async invalidate(
    @Param('patientUuid') patientUuid: string,
    @Param('entryUuid') entryUuid: string,
    @Body() dto: InvalidatePatientAudiometryEntryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientAudiometryEntryEntity> {
    return await this.invalidateUseCase.execute(
      patientUuid,
      entryUuid,
      user.tenantUuid,
      user.sub,
      dto.reason,
    );
  }
}
