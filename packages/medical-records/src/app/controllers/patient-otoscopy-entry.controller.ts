import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
  CreatePatientOtoscopyEntryDto,
  CreatePatientOtoscopyEntrySchema,
  UpdatePatientOtoscopyEntryDto,
  UpdatePatientOtoscopyEntrySchema,
} from '@medical-records/app/dtos/patient-otoscopy-entry.dto';
import { PatientOtoscopyEntryEntity } from '@medical-records/domain/entities/patient-otoscopy-entry.entity';
import {
  CreatePatientOtoscopyEntryUseCase,
  FindPatientOtoscopyEntriesUseCase,
  UpdatePatientOtoscopyEntryUseCase,
} from '@medical-records/domain/use-cases/patient-otoscopy-entries';

/** Historial de otoscopia por paciente: dato clínico, fuera del alcance de STAFF. */
@Controller('patients/:patientUuid/otoscopy-entries')
@UseGuards(AuthGuard, RolesGuard)
@SetMetadata(ROLES_METADATA_KEY, CLINICAL_ACCESS_ROLES)
export class PatientOtoscopyEntryController {
  constructor(
    private readonly createUseCase: CreatePatientOtoscopyEntryUseCase,
    private readonly findUseCase: FindPatientOtoscopyEntriesUseCase,
    private readonly updateUseCase: UpdatePatientOtoscopyEntryUseCase,
  ) {}

  @Get()
  async findAll(
    @Param('patientUuid') patientUuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientOtoscopyEntryEntity[]> {
    return await this.findUseCase.execute(patientUuid, user.tenantUuid);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreatePatientOtoscopyEntrySchema))
  async create(
    @Param('patientUuid') patientUuid: string,
    @Body() dto: CreatePatientOtoscopyEntryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientOtoscopyEntryEntity> {
    return await this.createUseCase.execute(patientUuid, user.tenantUuid, user.sub, dto);
  }

  @Patch(':entryUuid')
  @UsePipes(new ZodValidationPipe(UpdatePatientOtoscopyEntrySchema))
  async update(
    @Param('patientUuid') patientUuid: string,
    @Param('entryUuid') entryUuid: string,
    @Body() dto: UpdatePatientOtoscopyEntryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientOtoscopyEntryEntity> {
    return await this.updateUseCase.execute(patientUuid, entryUuid, user.tenantUuid, user.sub, dto);
  }
}
