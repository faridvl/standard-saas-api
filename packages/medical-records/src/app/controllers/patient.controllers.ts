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
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { AccessLevel } from '@medical-records/domain/policies/access.policy';
import { filterPatientClinicalFields } from '@medical-records/domain/policies/patient-clinical-fields.policy';
import { AccessGuard } from '@medical-records/app/guards/access.guard';
import {
  AnyLevel,
  ClinicalAccess,
  MinLevel,
  PatientEditAccess,
} from '@medical-records/app/decorators/access.decorators';
import { CreatePatientUseCase } from '../../domain/use-cases/create-patient.use-case';
import { CreatePatientDto, CreatePatientSchema } from '../dtos/create-patient.dto';
import { GetPatientsUseCase } from '@medical-records/domain/use-cases/get-patients.use-case';
import { GetStalePatientsUseCase } from '@medical-records/domain/use-cases/get-stale-patients.use-case';
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
import { UpdatePatientMaintenanceUseCase } from '@medical-records/domain/use-cases/update-patient-maintenance.use-case';
import {
  MaintenanceNumberSchema,
  UpdatePatientMaintenanceDto,
  UpdatePatientMaintenanceSchema,
} from '../dtos/update-patient-maintenance.dto';
import { isValidDayKey } from '@medical-records/domain/utils/lab-shipment-date.util';
import { PatientStatus } from '@medical-records/domain/types/patient-status.types';
import { FindPatientBackgroundUseCase } from '@medical-records/domain/use-cases/patient-background/find-patient-background.use-case';
import {
  FindPatientPhysicalExamUseCase,
  UpsertPatientPhysicalExamUseCase,
} from '@medical-records/domain/use-cases/patient-physical-exam';
import {
  UpsertPatientPhysicalExamDto,
  UpsertPatientPhysicalExamSchema,
} from '../dtos/patient-physical-exam.dto';
import { PatientPhysicalExamEntity } from '@medical-records/domain/entities/patient-physical-exam.entity';
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
import { PatientRecord } from '@medical-records/domain/types/patient-record.type';
import {
  NextAppointmentKind,
  PatientWithNextAppointment,
  StalePatient,
} from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { PaginatedResponse } from '@project/core/domain/types/pagination.types';
import { PatientBackgroundEntity } from '@medical-records/domain/entities/patient-background.entity';

// STAFF (recepción) no tiene acceso a antecedentes: son datos de salud
// sensibles (Ley 8968), no información administrativa.

/** "a,b" -> ['a', 'b']; vacío o ausente = sin filtrar. */
function parseList(value: string | undefined): string[] | undefined {
  const items = value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items?.length ? items : undefined;
}

/** "confirmed,tentative" -> kinds; 400 si alguno no existe. */
function parseKinds(value: string | undefined): NextAppointmentKind[] | undefined {
  const kinds = parseList(value);
  if (!kinds) return undefined;
  const valid = Object.values(NextAppointmentKind) as string[];
  const invalid = kinds.filter((kind) => !valid.includes(kind));
  if (invalid.length > 0) {
    throw new BadRequestException(`nextAppointmentKind inválido: ${invalid.join(', ')}`);
  }
  return kinds as NextAppointmentKind[];
}

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

function parseDayKey(value?: string): string | undefined {
  if (!value) return undefined;
  if (!isValidDayKey(value)) {
    throw new BadRequestException('hearingAidsInLabDate debe ser un día válido (AAAA-MM-DD)');
  }
  return value;
}

@Controller('patients')
@UseGuards(AuthGuard, AccessGuard)
@AnyLevel()
export class PatientController {
  constructor(
    private readonly createUseCase: CreatePatientUseCase,
    private readonly getPatientsUseCase: GetPatientsUseCase,
    private readonly getStalePatientsUseCase: GetStalePatientsUseCase,
    private readonly getPatientByUuidUseCase: GetPatientByUuidUseCase,
    private readonly updatePatientUseCase: UpdatePatientUseCase,
    private readonly updatePatientStatusUseCase: UpdatePatientStatusUseCase,
    private readonly updatePatientFlagsUseCase: UpdatePatientFlagsUseCase,
    private readonly updatePatientMaintenanceUseCase: UpdatePatientMaintenanceUseCase,
    private readonly findBackgroundUseCase: FindPatientBackgroundUseCase,
    private readonly upsertBackgroundUseCase: UpsertPatientBackgroundUseCase,
    private readonly findPhysicalExamUseCase: FindPatientPhysicalExamUseCase,
    private readonly upsertPhysicalExamUseCase: UpsertPatientPhysicalExamUseCase,
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
  async create(
    @Body() body: CreatePatientDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientRecord> {
    const created = await this.createUseCase.execute(body, {
      tenantId: user.tenantId,
      tenantUuid: user.tenantUuid,
      sub: user.sub,
    });
    return filterPatientClinicalFields(created, user.attendsPatients === true);
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
    // Sedes, tipos y meses aceptan varios valores separados por coma.
    @Query('branchUuid') branchUuid?: string,
    @Query('appointmentTypeUuid') appointmentTypeUuid?: string,
    @Query('hearingAidsInLab') hearingAidsInLab?: string,
    @Query('hasActiveWarranty') hasActiveWarranty?: string,
    @Query('isVideoCandidate') isVideoCandidate?: string,
    @Query('warrantyExpired') warrantyExpired?: string,
    @Query('renewPrescription') renewPrescription?: string,
    @Query('isPriority') isPriority?: string,
    // Solo con hearingAidsInLab=true: día de envío "YYYY-MM-DD" (hora de Costa Rica).
    @Query('hearingAidsInLabDate') hearingAidsInLabDate?: string,
    @Query('nextAppointmentKind') nextAppointmentKind?: string,
  ): Promise<PaginatedResponse<PatientWithNextAppointment>> {
    return await this.getPatientsUseCase.execute(
      user.tenantUuid,
      Number(page),
      Number(limit),
      includeInactive === 'true',
      search,
      parseList(nextAppointmentMonth),
      {
        statuses: parseStatuses(status),
        branchUuids: parseList(branchUuid),
        appointmentTypeUuids: parseList(appointmentTypeUuid),
        hearingAidsInLab: hearingAidsInLab === 'true',
        hasActiveWarranty: hasActiveWarranty === 'true',
        isVideoCandidate: isVideoCandidate === 'true',
        warrantyExpired: warrantyExpired === 'true',
        renewPrescription: renewPrescription === 'true',
        isPriority: isPriority === 'true',
        hearingAidsInLabSentDay: parseDayKey(hearingAidsInLabDate),
        nextAppointmentKinds: parseKinds(nextAppointmentKind),
      },
      user.attendsPatients === true,
    );
  }

  // Antes de `:uuid` para que "stale" no se lea como un uuid.
  @Get('stale')
  async findStale(@CurrentUser() user: JwtPayload): Promise<StalePatient[]> {
    return await this.getStalePatientsUseCase.execute(user.tenantUuid);
  }

  @Delete(':uuid')
  @MinLevel(AccessLevel.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.softDeletePatientUseCase.execute(uuid, user.tenantUuid);
  }

  @Get(':uuid')
  async findOne(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientRecord> {
    return await this.getPatientByUuidUseCase.execute(
      uuid,
      user.tenantUuid,
      user.attendsPatients === true,
    );
  }

  @Patch(':uuid')
  @PatientEditAccess()
  @UsePipes(new ZodValidationPipe(UpdatePatientSchema))
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientRecord> {
    const updated = await this.updatePatientUseCase.execute(uuid, user.tenantUuid, dto, user.sub);
    return filterPatientClinicalFields(updated, user.attendsPatients === true);
  }

  @Put(':uuid/status')
  @PatientEditAccess()
  @UsePipes(new ZodValidationPipe(UpdatePatientStatusSchema))
  async updateStatus(
    @Param('uuid') uuid: string,
    @Body() dto: UpdatePatientStatusDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientRecord> {
    const updated = await this.updatePatientStatusUseCase.execute(
      uuid,
      user.tenantUuid,
      user.sub,
      dto,
    );
    return filterPatientClinicalFields(updated, user.attendsPatients === true);
  }

  @Put(':uuid/flags')
  @ClinicalAccess()
  @UsePipes(new ZodValidationPipe(UpdatePatientFlagsSchema))
  async updateFlags(
    @Param('uuid') uuid: string,
    @Body() dto: UpdatePatientFlagsDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientRecord> {
    const updated = await this.updatePatientFlagsUseCase.execute(
      uuid,
      user.tenantUuid,
      user.sub,
      dto,
      user.attendsPatients,
    );
    return filterPatientClinicalFields(updated, user.attendsPatients === true);
  }

  @Put(':uuid/maintenances/:number')
  @ClinicalAccess()
  @UsePipes(new ZodValidationPipe(UpdatePatientMaintenanceSchema))
  async updateMaintenance(
    @Param('uuid') uuid: string,
    @Param('number') number: string,
    @Body() dto: UpdatePatientMaintenanceDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientRecord> {
    const parsedNumber = MaintenanceNumberSchema.safeParse(number);
    if (!parsedNumber.success) {
      throw new BadRequestException(parsedNumber.error.issues[0].message);
    }
    return await this.updatePatientMaintenanceUseCase.execute(
      uuid,
      user.tenantUuid,
      user.sub,
      parsedNumber.data,
      dto,
    );
  }

  @Get(':uuid/background')
  @ClinicalAccess()
  async getBackground(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientBackgroundEntity | null> {
    return await this.findBackgroundUseCase.execute(uuid, user.tenantUuid);
  }

  @Put(':uuid/background')
  @ClinicalAccess()
  @UsePipes(new ZodValidationPipe(UpsertPatientBackgroundSchema))
  async upsertBackground(
    @Param('uuid') uuid: string,
    @Body() dto: UpsertPatientBackgroundDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientBackgroundEntity> {
    return await this.upsertBackgroundUseCase.execute(uuid, user.tenantUuid, user.sub, dto);
  }

  @Get(':uuid/physical-exam')
  @ClinicalAccess()
  async getPhysicalExam(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientPhysicalExamEntity | null> {
    return await this.findPhysicalExamUseCase.execute(uuid, user.tenantUuid);
  }

  @Put(':uuid/physical-exam')
  @ClinicalAccess()
  @UsePipes(new ZodValidationPipe(UpsertPatientPhysicalExamSchema))
  async upsertPhysicalExam(
    @Param('uuid') uuid: string,
    @Body() dto: UpsertPatientPhysicalExamDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PatientPhysicalExamEntity | null> {
    return await this.upsertPhysicalExamUseCase.execute(uuid, user.tenantUuid, user.sub, dto);
  }
}
