import { Controller, Post, Body, UseGuards, UsePipes, Query, Get, Param, Patch, Put, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { CreatePatientUseCase } from '../../domain/use-cases/create-patient.use-case';
import { CreatePatientDto, CreatePatientSchema } from '../dtos/create-patient.dto';
import { GetPatientsUseCase } from '@medical-records/domain/use-cases/get-patients.use-case';
import { GetPatientByUuidUseCase } from '@medical-records/domain/use-cases/get-patient-by-uuid.use-case';
import { UpdatePatientUseCase } from '@medical-records/domain/use-cases/update-patient.use-case';
import { UpdatePatientDto, UpdatePatientSchema } from '../dtos/update-patient.dto';
import { FindPatientBackgroundUseCase } from '@medical-records/domain/use-cases/patient-background/find-patient-background.use-case';
import { SoftDeletePatientUseCase } from '@medical-records/domain/use-cases/soft-delete-patient.use-case';
import { UpsertPatientBackgroundUseCase } from '@medical-records/domain/use-cases/patient-background/upsert-patient-background.use-case';
import { UpsertPatientBackgroundDto, UpsertPatientBackgroundSchema } from '../dtos/patient-background.dto';
import { BulkImportPatientsUseCase } from '@medical-records/domain/use-cases/bulk-import-patients.use-case';
import { BulkImportPatientsDto, BulkImportPatientsSchema } from '../dtos/bulk-import-patients.dto';

@Controller('patients')
@UseGuards(AuthGuard)
export class PatientController {
  constructor(
    private readonly createUseCase: CreatePatientUseCase,
    private readonly getPatientsUseCase: GetPatientsUseCase,
    private readonly getPatientByUuidUseCase: GetPatientByUuidUseCase,
    private readonly updatePatientUseCase: UpdatePatientUseCase,
    private readonly findBackgroundUseCase: FindPatientBackgroundUseCase,
    private readonly upsertBackgroundUseCase: UpsertPatientBackgroundUseCase,
    private readonly softDeletePatientUseCase: SoftDeletePatientUseCase,
    private readonly bulkImportUseCase: BulkImportPatientsUseCase,
  ) {}

  @Post('bulk')
  @UsePipes(new ZodValidationPipe(BulkImportPatientsSchema))
  async bulkImport(@Body() body: BulkImportPatientsDto, @CurrentUser() user: JwtPayload) {
    return await this.bulkImportUseCase.execute(body.patients, {
      tenantId: user.tenantId,
      tenantUuid: user.tenantUuid,
      sub: user.sub,
    });
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreatePatientSchema))
  async create(@Body() body: CreatePatientDto, @CurrentUser() user: JwtPayload) {
    return await this.createUseCase.execute(body, {
      tenantId: user.tenantId,
      tenantUuid: user.tenantUuid,
      sub: user.sub,
    });
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('includeInactive') includeInactive: string = 'false',
    @Query('search') search?: string,
  ) {
    return await this.getPatientsUseCase.execute(
      user.tenantUuid,
      Number(page),
      Number(limit),
      includeInactive === 'true',
      search,
    );
  }

  @Delete(':uuid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload) {
    await this.softDeletePatientUseCase.execute(uuid, user.tenantUuid);
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload) {
    return await this.getPatientByUuidUseCase.execute(uuid, user.tenantUuid);
  }

  @Patch(':uuid')
  @UsePipes(new ZodValidationPipe(UpdatePatientSchema))
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.updatePatientUseCase.execute(uuid, user.tenantUuid, dto);
  }

  @Get(':uuid/background')
  async getBackground(@Param('uuid') uuid: string) {
    return await this.findBackgroundUseCase.execute(uuid);
  }

  @Put(':uuid/background')
  @UsePipes(new ZodValidationPipe(UpsertPatientBackgroundSchema))
  async upsertBackground(
    @Param('uuid') uuid: string,
    @Body() dto: UpsertPatientBackgroundDto,
  ) {
    return await this.upsertBackgroundUseCase.execute(uuid, dto);
  }
}
