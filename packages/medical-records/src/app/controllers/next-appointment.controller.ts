import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import {
  ScheduleNextAppointmentDto,
  ScheduleNextAppointmentSchema,
  SetTentativeMonthDto,
  SetTentativeMonthSchema,
} from '@medical-records/app/dtos/next-appointment.dto';
import { ScheduleNextAppointmentUseCase } from '@medical-records/domain/use-cases/appointments/schedule-next-appointment.use-case';
import { SetTentativeMonthUseCase } from '@medical-records/domain/use-cases/appointments/set-tentative-month.use-case';
import { Appointment } from '@medical-records/domain/types/appointment.types';

/**
 * Agendar rápido desde el detalle del paciente: solo fecha/hora y sede. Usa
 * un AppointmentType genérico fijo (ver ScheduleNextAppointmentUseCase) y
 * reemplaza (COMPLETED) cualquier cita CONFIRMED futura previa del paciente.
 */
@Controller('patients/:patientUuid/next-appointment')
@UseGuards(AuthGuard)
export class NextAppointmentController {
  constructor(
    private readonly scheduleUseCase: ScheduleNextAppointmentUseCase,
    private readonly setTentativeMonthUseCase: SetTentativeMonthUseCase,
  ) {}

  @Post()
  @UsePipes(new ZodValidationPipe(ScheduleNextAppointmentSchema))
  async schedule(
    @Param('patientUuid') patientUuid: string,
    @Body() dto: ScheduleNextAppointmentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Appointment> {
    return await this.scheduleUseCase.execute(patientUuid, user.tenantUuid, user.sub, dto);
  }

  /**
   * Mes tentativo, previo a tener día. Anotarlo cancela la cita CONFIRMED
   * futura que el paciente tuviera: se vuelve a "solo mes" justamente
   * cuando la fecha que había dejó de valer.
   */
  @Put('tentative-month')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UsePipes(new ZodValidationPipe(SetTentativeMonthSchema))
  async setTentativeMonth(
    @Param('patientUuid') patientUuid: string,
    @Body() dto: SetTentativeMonthDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.setTentativeMonthUseCase.execute(
      patientUuid,
      user.tenantUuid,
      dto.month,
      dto.typeUUID,
    );
  }
}
