import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UsePipes,
  Delete,
  Param,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { AccessGuard } from '@medical-records/app/guards/access.guard';
import { IdentityServiceGuard } from '@medical-records/app/guards/identity-service.guard';
import { AnyLevel, MinLevel } from '@medical-records/app/decorators/access.decorators';
import { AccessLevel } from '@medical-records/domain/policies/access.policy';
import { FindAllAppointmentTypesUseCase } from '@medical-records/domain/use-cases/appointment-types/find-all-appointment-types.use-case';
import { CreateAppointmentTypeUseCase } from '@medical-records/domain/use-cases/appointment-types/create-appointment-type.use-case';
import { InitializeAppointmentTypesUseCase } from '@medical-records/domain/use-cases/appointment-types/initialize-appointment-types.use-case';
import { DeleteAppointmentTypeUseCase } from '@medical-records/domain/use-cases/appointment-types/delete-appointment-type.use-case';
import { UpdateAppointmentTypeUseCase } from '@medical-records/domain/use-cases/appointment-types/update-appointment-type.use-case';
import {
  CreateAppointmentTypeDto,
  CreateAppointmentTypeSchema,
  UpdateAppointmentTypeDto,
  UpdateAppointmentTypeSchema,
} from '@medical-records/app/dtos/appointment-type.dto';
import { z } from 'zod';
import { AppointmentTypeEntity } from '@medical-records/domain/entities/appointment-type.entity';

const InitializeAppointmentTypesSchema = z.object({
  tenantUuid: z.string().uuid({ message: 'tenantUuid debe ser un UUID válido' }),
});

type InitializeAppointmentTypesDto = z.infer<typeof InitializeAppointmentTypesSchema>;

@Controller('appointment-types')
export class AppointmentTypeController {
  constructor(
    private readonly findAllUseCase: FindAllAppointmentTypesUseCase,
    private readonly createUseCase: CreateAppointmentTypeUseCase,
    private readonly initializeUseCase: InitializeAppointmentTypesUseCase,
    private readonly deleteUseCase: DeleteAppointmentTypeUseCase,
    private readonly updateUseCase: UpdateAppointmentTypeUseCase,
  ) {}

  @Get()
  @UseGuards(AuthGuard, AccessGuard)
  @AnyLevel()
  async findAll(@CurrentUser() user: JwtPayload): Promise<AppointmentTypeEntity[]> {
    return await this.findAllUseCase.execute(user.tenantUuid);
  }

  // Ver los tipos lo necesita todo el que agenda; cambiarlos es configuración: STAFF no.
  @Post()
  @UseGuards(AuthGuard, AccessGuard)
  @MinLevel(AccessLevel.ADMIN)
  @UsePipes(new ZodValidationPipe(CreateAppointmentTypeSchema))
  async create(
    @Body() dto: CreateAppointmentTypeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AppointmentTypeEntity> {
    return await this.createUseCase.execute(user.tenantUuid, dto);
  }

  @Patch(':uuid')
  @UseGuards(AuthGuard, AccessGuard)
  @MinLevel(AccessLevel.ADMIN)
  @UsePipes(new ZodValidationPipe(UpdateAppointmentTypeSchema))
  async update(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateAppointmentTypeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AppointmentTypeEntity> {
    return await this.updateUseCase.execute(user.tenantUuid, uuid, dto);
  }

  @Delete(':uuid')
  @UseGuards(AuthGuard, AccessGuard)
  @MinLevel(AccessLevel.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload): Promise<void> {
    await this.deleteUseCase.execute(user.tenantUuid, uuid);
  }

  // Solo la llamada de servicio de identity al registrar una clínica (ver IdentityServiceGuard).
  @Post('initialize')
  @UseGuards(IdentityServiceGuard)
  @UsePipes(new ZodValidationPipe(InitializeAppointmentTypesSchema))
  async initialize(@Body() dto: InitializeAppointmentTypesDto): Promise<AppointmentTypeEntity[]> {
    return await this.initializeUseCase.execute(dto.tenantUuid);
  }
}
