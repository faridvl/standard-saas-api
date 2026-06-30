import { Controller, Get, Post, Body, UseGuards, UsePipes, Headers, ForbiddenException, Delete, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { FindAllAppointmentTypesUseCase } from '@medical-records/domain/use-cases/appointment-types/find-all-appointment-types.use-case';
import { CreateAppointmentTypeUseCase } from '@medical-records/domain/use-cases/appointment-types/create-appointment-type.use-case';
import { InitializeAppointmentTypesUseCase } from '@medical-records/domain/use-cases/appointment-types/initialize-appointment-types.use-case';
import { DeleteAppointmentTypeUseCase } from '@medical-records/domain/use-cases/appointment-types/delete-appointment-type.use-case';
import {
  CreateAppointmentTypeDto,
  CreateAppointmentTypeSchema,
} from '@medical-records/app/dtos/appointment-type.dto';
import { z } from 'zod';

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
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@CurrentUser() user: JwtPayload) {
    return await this.findAllUseCase.execute(user.tenantUuid);
  }

  @Post()
  @UseGuards(AuthGuard)
  @UsePipes(new ZodValidationPipe(CreateAppointmentTypeSchema))
  async create(@Body() dto: CreateAppointmentTypeDto, @CurrentUser() user: JwtPayload) {
    return await this.createUseCase.execute(user.tenantUuid, dto);
  }

  @Delete(':uuid')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload) {
    await this.deleteUseCase.execute(user.tenantUuid, uuid);
  }

  @Post('initialize')
  @UsePipes(new ZodValidationPipe(InitializeAppointmentTypesSchema))
  async initialize(
    @Body() dto: InitializeAppointmentTypesDto,
    @Headers('x-internal-call') internalHeader: string | undefined,
    @Headers('authorization') authHeader: string | undefined,
  ) {
    const isInternal = internalHeader === 'true';
    const isUnauthenticated = !authHeader;

    if (!isInternal && !isUnauthenticated) {
      throw new ForbiddenException('Este endpoint es solo para llamadas internas');
    }

    return await this.initializeUseCase.execute(dto.tenantUuid);
  }
}
