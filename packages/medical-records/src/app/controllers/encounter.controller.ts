import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { CreateEncounterUseCase } from '@medical-records/domain/use-cases/encounters/create-encounter.use-case';
import { FindByPatientEncounterUseCase } from '@medical-records/domain/use-cases/encounters/find-by-patient-encounter.use-case';
import { FindOneEncounterUseCase } from '@medical-records/domain/use-cases/encounters/find-one-encounter.use-case';
import { CloseEncounterUseCase } from '@medical-records/domain/use-cases/encounters/close-encounter.use-case';
import { CreateEncounterDto, CreateEncounterSchema } from '../dtos/encounter.dto';
import {
  EncounterEntity,
  EncounterDetail,
} from '@medical-records/domain/entities/encounter.entity';

// STAFF (recepción) no tiene acceso a notas clínicas: Ley 8968 clasifica los
// datos de salud como sensibles. Mismo criterio que MedicalControlController.
const STAFF_ROLE = 'STAFF';

@Controller('encounters')
@UseGuards(AuthGuard)
export class EncounterController {
  constructor(
    private readonly createUseCase: CreateEncounterUseCase,
    private readonly findByPatientUseCase: FindByPatientEncounterUseCase,
    private readonly findOneUseCase: FindOneEncounterUseCase,
    private readonly closeUseCase: CloseEncounterUseCase,
  ) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateEncounterSchema))
  async create(
    @Body() dto: CreateEncounterDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<EncounterEntity> {
    if (user.role === STAFF_ROLE) {
      throw new ForbiddenException('El personal administrativo no tiene acceso a notas clínicas');
    }

    return this.createUseCase.execute(dto, {
      tenantUuid: user.tenantUuid,
      userUuid: user.sub,
    });
  }

  @Get('patient/:uuid')
  async findByPatient(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<EncounterEntity[]> {
    if (user.role === STAFF_ROLE) {
      throw new ForbiddenException('El personal administrativo no tiene acceso a notas clínicas');
    }

    // La especialidad determina qué se puede crear, nunca qué se puede ver
    // (NOM-004 5.14): un solo expediente con todos los encuentros del paciente.
    return this.findByPatientUseCase.execute(uuid, user.tenantUuid);
  }

  @Get(':uuid')
  async findOne(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<EncounterDetail> {
    if (user.role === STAFF_ROLE) {
      throw new ForbiddenException('El personal administrativo no tiene acceso a notas clínicas');
    }

    return this.findOneUseCase.execute(uuid, user.tenantUuid);
  }

  @Patch(':uuid/close')
  async close(
    @Param('uuid') uuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<EncounterEntity> {
    if (user.role === STAFF_ROLE) {
      throw new ForbiddenException('El personal administrativo no tiene acceso a notas clínicas');
    }

    return this.closeUseCase.execute(uuid, user.tenantUuid);
  }
}
