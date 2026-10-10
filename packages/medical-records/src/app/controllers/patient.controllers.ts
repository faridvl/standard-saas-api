import {
  Controller,
  Post,
  Body,
  UseGuards,
  UsePipes,
  Query,
  Get,
  Param,
  Patch,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { CreatePatientUseCase } from '../../domain/use-cases/create-patient.use-case';
import { CreatePatientDto, CreatePatientSchema } from '../dtos/create-patient.dto';
import { GetPatientsUseCase } from '@medical-records/domain/use-cases/get-patients.use-case';
import { GetPatientByUuidUseCase } from '@medical-records/domain/use-cases/get-patient-by-uuid.use-case';
import { UpdatePatientUseCase } from '@medical-records/domain/use-cases/update-patient.use-case';
import { UpdatePatientDto, UpdatePatientSchema } from '../dtos/update-patient.dto';
import {
  UpdatePatientStatusDto,
  UpdatePatientStatusSchema,
} from '../dtos/update-patient-status.dto';
import { UpdatePatientStatusUseCase } from '@medical-records/domain/use-cases/update-patient-status.use-case';
import { UpdatePatientFlagsUseCase } from '@medical-records/domain/use-cases/update-patient-flags.use-case';
import { UpdatePatientFlagsDto, UpdatePatientFlagsSchema } from '../dtos/update-patient-flags.dto';
import { PatientStatus } from '@medical-records/domain/types/patient-status.types';
import { FindPatientBackgroundUseCase } from '@medical-records/domain/use-cases/patient-background/find-patient-background.use-case';
import { SoftDeletePatientUseCase } from '@medical-records/domain/use-cases/soft-delete-patient.use-case';
import { UpsertPatientBackgroundUseCase } from '@medical-records/domain/use-cases/patient-background/upsert-patient-background.use-case';
import {
  UpsertPatientBackgroundDto,
  UpsertPatientBackgroundSchema,
} from '../dtos/patient-background.dto';
import {
  BulkImportPatientsUseCase,
  BulkImportResult,
} from '@medical-records/domain/use-cases/bulk-import-patients.use-case';
import { BulkImportPatientsDto, BulkImportPatientsSchema } from '../dtos/bulk-import-patients.dto';
import { Patient } from '@prisma/client';
import { PatientWithNextAppointment } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { PaginatedResponse } from '@project/core/domain/types/pagination.types';
import { PatientBackgroundEntity } from '@medical-records/domain/entities/patient-background.entity';

// STAFF (recepción) no tiene acceso a antecedentes: son datos de salud
// sensibles (Ley 8968), no información administrativa.
const STAFF_ROLE = 'STAFF';

/** "ACTIVE,INACTIVE" -> ['ACTIVE', 'INACTIVE']; 400 si alguno no existe. */
function parseStatuses(value: string | undefined): PatientStatus[] | undefined {
  if (!value) return undefined;
  const statuses = value.split(',').map((status) => status.trim());
  const valid = Object.values(PatientStatus) as string[];
  const invalid = statuses.filter((status) => !valid.includes(status));
  if (invalid.length > 0) {
    throw new BadRequestException(`status inválido: ${invalid.join(', ')}`);
  }
  return statuses as PatientStatus[];
}

@Controller('patients')
@UseGuards(AuthGuard)
export class PatientController {
  constructor(
    private readonly createUseCase: CreatePatientUseCase,
    private readonly getPatientsUseCase: GetPatientsUseCase,
    private readonly getPatientByUuidUseCase: GetPatientByUuidUseCase,
    private readonly updatePatientUseCase: UpdatePatientUseCase,
    private readonly updatePatientStatusUseCase: UpdatePatientStatusUseCase,
    private readonly updatePatientFlagsUseCase: UpdatePatientFlagsUseCase,
    private readonly findBackgroundUseCase: FindPatientBackgroundUseCase,
    private readonly upsertBackgroundUseCase: UpsertPatientBackgroundUseCase,
    private readonly softDeletePatientUseCase: SoftDeletePatientUseCase,
    private readonly bulkImportUseCase: BulkImportPatientsUseCase,
  ) {}

  @Post('bulk')
  @UsePipes(new ZodValidationPipe(BulkImportPatientsSchema))
  async bulkImport(
    @Body() body: BulkImportPatientsDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<BulkImportResult> {
    return await this.bulkImportUseCase.execute(body.patients, {
      tenantId: user.tenantId,
      tenantUuid: user.tenantUuid,
      sub: user.sub,
    });
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreatePatientSchema))
  async create(@Body() body: CreatePatientDto, @CurrentUser() user: JwtPayload): Promise<Patient> {
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
    @Query('nextAppointmentMonth') nextAppointmentMonth?: string,
    @Query('status') status?: string,
    @Query('branchUuid') branchUuid?: string,
    @Query('appointmentTypeUuid') appointmentTypeUuid?: string,
  ): Promise<PaginatedResponse<PatientWithNextAppointment>> {
    return await this.getPatientsUseCase.execute(
      user.tenantUuid,
      Number(page),
      Number(limit),
      includeInactive === 'true',
      search,
      nextAppointmentMonth,
      {
        statuses: parseStatuses(status),
        branchUuid: branchUuid || undefined,
        appointmentTypeUuid: appointmentTypeUuid || undefined,
      },
    );
  }

  @Delete(':uuid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.softDeletePatientUseCase.execute(uuid, user.tenantUuid);
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload): Promise<Patient> {
    return await this.getPatientByUuidUseCase.execute(uuid, user.tenantUuid);
  }

  @Patch(':uuid')
  @UsePipes(new ZodValidationPipe(UpdatePatientSchema))
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Patient> {
    return await this.updatePatientUseCase.execute(uuid, user.tenantUuid, dto, user.sub);
  }

  @Put(':uuid/status')
  @UsePipes(new ZodValidationPipe(UpdatePatientStatusSchema))
  async updateStatus(
    @Param('uuid') uuid: string,
    @Body() dto: UpdatePatientStatusDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Patient> {
    return await this.updatePatientStatusUseCase.execute(uuid, user.tenantUuid, user.sub, dto);
  }

  @Put(':uuid/flags')
  @UsePipes(new ZodValidationPipe(UpdatePatientFlagsSchema))
  async updateFlags(
    @Param('uuid') uuid: string,
    @Body() dto: UpdatePatientFlagsDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Patient> {
    return await this.updatePatientFlagsUseCase.execute(uuid, user.tenantUuid, user.sub, dto);
  }

  @Get(':uuid/background')
  async getBackground(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientBackgroundEntity | null> {
    if (user.role === STAFF_ROLE) {
      throw new ForbiddenException(
        'El personal administrativo no tiene acceso a antecedentes clínicos',
      );
    }
    return await this.findBackgroundUseCase.execute(uuid);
  }

  @Put(':uuid/background')
  @UsePipes(new ZodValidationPipe(UpsertPatientBackgroundSchema))
  async upsertBackground(
    @Param('uuid') uuid: string,
    @Body() dto: UpsertPatientBackgroundDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientBackgroundEntity> {
    if (user.role === STAFF_ROLE) {
      throw new ForbiddenException(
        'El personal administrativo no tiene acceso a antecedentes clínicos',
      );
    }
    return await this.upsertBackgroundUseCase.execute(uuid, dto);
  }
}
