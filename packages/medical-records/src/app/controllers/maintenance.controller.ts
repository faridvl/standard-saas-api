import { Body, Controller, Get, Param, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import { CreateMaintenanceUseCase } from '@medical-records/domain/use-cases/maintenance/create-maintenance.use-case';
import { FindByPatientMaintenanceUseCase } from '@medical-records/domain/use-cases/maintenance/find-by-patient-maintenance.use-case';
import { FindUpcomingMaintenanceUseCase } from '@medical-records/domain/use-cases/maintenance/find-upcoming-maintenance.use-case';
import { CreateMaintenanceDto, CreateMaintenanceSchema } from '../dtos/maintenance.dto';
import { MaintenanceEntity } from '@medical-records/domain/entities/maintenance.entity';

@Controller('maintenance')
@UseGuards(AuthGuard)
export class MaintenanceController {
  constructor(
    private readonly createUseCase: CreateMaintenanceUseCase,
    private readonly findByPatientUseCase: FindByPatientMaintenanceUseCase,
    private readonly findUpcomingUseCase: FindUpcomingMaintenanceUseCase,
  ) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateMaintenanceSchema))
  async create(@Body() dto: CreateMaintenanceDto, @CurrentUser() user: JwtPayload): Promise<MaintenanceEntity> {
    return this.createUseCase.execute(dto, {
      tenantUuid: user.tenantUuid,
      userUuid: user.sub,
    });
  }

  @Get('patient/:uuid')
  async findByPatient(@Param('uuid') uuid: string, @CurrentUser() user: JwtPayload): Promise<MaintenanceEntity[]> {
    return this.findByPatientUseCase.execute(uuid, user.tenantUuid);
  }

  @Get('upcoming')
  async findUpcoming(@Query('month') month: string, @CurrentUser() user: JwtPayload): Promise<MaintenanceEntity[]> {
    const targetMonth = month ?? new Date().toISOString().slice(0, 7);
    return this.findUpcomingUseCase.execute(user.tenantUuid, targetMonth);
  }
}
