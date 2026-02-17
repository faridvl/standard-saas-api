import { CreateMedicalControlUseCase } from '@medical-records/domain/use-cases/medical-control/create-medical-control.use-case';
import { Controller, Post, Get, Body, Query, Param, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import {
  CreateMedicalControlDto,
  CreateMedicalControlSchema,
} from '../dtos/create-medical-control.dto';
import { FindAllMedicalControlsUseCase } from '@medical-records/domain/use-cases/medical-control/find-all-medical-controls.use-case';
import { FindOneMedicalControlUseCase } from '@medical-records/domain/use-cases/medical-control/find-one-medical-control.use-case';

@Controller('medical-controls')
@UseGuards(AuthGuard)
export class MedicalControlController {
  constructor(
    private readonly createUseCase: CreateMedicalControlUseCase,
    private readonly findAllUseCase: FindAllMedicalControlsUseCase,
    private readonly findOneUseCase: FindOneMedicalControlUseCase,
  ) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateMedicalControlSchema))
  async create(@Body() dto: CreateMedicalControlDto, @CurrentUser() user: JwtPayload) {
    return await this.createUseCase.execute(dto, {
      tenantUuid: user.tenantUuid,
      userUuid: user.sub,
    });
  }

  @Get('patient/:patientUUID')
  async findByPatient(
    @Param('patientUUID') patientUUID: string,
    @CurrentUser() user: JwtPayload,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return await this.findAllUseCase.execute(
      patientUUID,
      { tenantUuid: user.tenantUuid },
      { page: Number(page), limit: Number(limit) },
    );
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload) {
    return await this.findOneUseCase.execute(uuid, {
      tenantUuid: user.tenantUuid,
      userUuid: user.sub,
    });
  }
}
