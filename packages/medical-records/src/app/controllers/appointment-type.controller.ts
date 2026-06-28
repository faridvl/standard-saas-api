import { Controller, Get, Post, Body, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { FindAllAppointmentTypesUseCase } from '@medical-records/domain/use-cases/appointment-types/find-all-appointment-types.use-case';
import { CreateAppointmentTypeUseCase } from '@medical-records/domain/use-cases/appointment-types/create-appointment-type.use-case';
import {
  CreateAppointmentTypeDto,
  CreateAppointmentTypeSchema,
} from '@medical-records/app/dtos/appointment-type.dto';

@Controller('appointment-types')
@UseGuards(AuthGuard)
export class AppointmentTypeController {
  constructor(
    private readonly findAllUseCase: FindAllAppointmentTypesUseCase,
    private readonly createUseCase: CreateAppointmentTypeUseCase,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    return await this.findAllUseCase.execute(user.tenantUuid);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreateAppointmentTypeSchema))
  async create(@Body() dto: CreateAppointmentTypeDto, @CurrentUser() user: JwtPayload) {
    return await this.createUseCase.execute(user.tenantUuid, dto);
  }
}
