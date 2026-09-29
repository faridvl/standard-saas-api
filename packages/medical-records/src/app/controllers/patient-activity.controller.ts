import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload } from '@project/core';
import { PaginatedResponse } from '@project/core/domain/types/pagination.types';
import {
  FindPatientActivityActorsUseCase,
  FindPatientActivityMonthsUseCase,
  FindPatientActivityUseCase,
  SummarizePatientActivityUseCase,
} from '@medical-records/domain/use-cases/patient-activity';
import {
  PatientActivityAction,
  PatientActivityActor,
  PatientActivityItem,
  PatientActivitySummary,
} from '@medical-records/domain/types/patient-activity.types';

const MAX_LIMIT = 100;

function parseDate(value: string | undefined, name: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${name} no es una fecha válida (ISO 8601)`);
  }
  return date;
}

function parseActions(value: string | undefined): PatientActivityAction[] | undefined {
  if (!value) return undefined;
  const actions = value.split(',').map((action) => action.trim());
  const validActions = Object.values(PatientActivityAction) as string[];
  const invalid = actions.filter((action) => !validActions.includes(action));
  if (invalid.length > 0) {
    throw new BadRequestException(`action inválida: ${invalid.join(', ')}`);
  }
  return actions as PatientActivityAction[];
}

/** Bitácora de acciones sobre los pacientes del tenant (solo lectura). */
@Controller('patient-activity')
@UseGuards(AuthGuard)
export class PatientActivityController {
  constructor(
    private readonly findUseCase: FindPatientActivityUseCase,
    private readonly findActorsUseCase: FindPatientActivityActorsUseCase,
    private readonly findMonthsUseCase: FindPatientActivityMonthsUseCase,
    private readonly summarizeUseCase: SummarizePatientActivityUseCase,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('actorUuid') actorUuid?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('branchUuid') branchUuid?: string,
    @Query('appointmentTypeUuid') appointmentTypeUuid?: string,
  ): Promise<PaginatedResponse<PatientActivityItem>> {
    return await this.findUseCase.execute(user.tenantUuid, {
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(MAX_LIMIT, Math.max(1, Number(limit) || 20)),
      actorUuid: actorUuid || undefined,
      actions: parseActions(action),
      from: parseDate(from, 'from'),
      to: parseDate(to, 'to'),
      search: search?.trim() || undefined,
      branchUuid: branchUuid || undefined,
      appointmentTypeUuid: appointmentTypeUuid || undefined,
    });
  }

  @Get('actors')
  async findActors(@CurrentUser() user: JwtPayload): Promise<PatientActivityActor[]> {
    return await this.findActorsUseCase.execute(user.tenantUuid);
  }

  @Get('months')
  async findMonths(
    @CurrentUser() user: JwtPayload,
    @Query('timeZone') timeZone?: string,
  ): Promise<{ months: string[] }> {
    const months = await this.findMonthsUseCase.execute(user.tenantUuid, timeZone);
    return { months };
  }

  @Get('summary')
  async summary(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<PatientActivitySummary> {
    return await this.summarizeUseCase.execute(
      user.tenantUuid,
      parseDate(from, 'from'),
      parseDate(to, 'to'),
    );
  }
}
