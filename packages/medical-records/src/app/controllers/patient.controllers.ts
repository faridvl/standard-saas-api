import { Controller, Post, Body, UseGuards, UsePipes, Query, Get, Param } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { CreatePatientUseCase } from '../../domain/use-cases/create-patient.use-case';
import { CreatePatientDto, CreatePatientSchema } from '../dtos/create-patient.dto';
import { GetPatientsUseCase } from '@medical-records/domain/use-cases/get-patients.use-case';
import { GetPatientByUuidUseCase } from '@medical-records/domain/use-cases/get-patient-by-uuid.use-case';

@Controller('patients')
@UseGuards(AuthGuard)
export class PatientController {
  constructor(
    private readonly createUseCase: CreatePatientUseCase,
    private readonly getPatientsUseCase: GetPatientsUseCase,
    private readonly getPatientByUuidUseCase: GetPatientByUuidUseCase,
  ) {}

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
  ) {
    return await this.getPatientsUseCase.execute(user.tenantUuid, Number(page), Number(limit));
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload) {
    return await this.getPatientByUuidUseCase.execute(uuid, user.tenantUuid);
  }
}
