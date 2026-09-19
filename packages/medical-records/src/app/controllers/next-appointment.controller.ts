import { Body, Controller, Param, Post, UseGuards, UsePipes } from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import {
  ScheduleNextAppointmentDto,
  ScheduleNextAppointmentSchema,
} from '@medical-records/app/dtos/next-appointment.dto';
import { ScheduleNextAppointmentUseCase } from '@medical-records/domain/use-cases/appointments/schedule-next-appointment.use-case';
import { Appointment } from '@medical-records/domain/types/appointment.types';

/**
 * Agendar rápido desde el detalle del paciente: solo fecha/hora y sede. Usa
 * un AppointmentType genérico fijo (ver ScheduleNextAppointmentUseCase) y
 * reemplaza (COMPLETED) cualquier cita CONFIRMED futura previa del paciente.
 */
@Controller('patients/:patientUuid/next-appointment')
@UseGuards(AuthGuard)
export class NextAppointmentController {
  constructor(private readonly scheduleUseCase: ScheduleNextAppointmentUseCase) {}

  @Post()
  @UsePipes(new ZodValidationPipe(ScheduleNextAppointmentSchema))
  async schedule(
    @Param('patientUuid') patientUuid: string,
    @Body() dto: ScheduleNextAppointmentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Appointment> {
    return await this.scheduleUseCase.execute(patientUuid, user.tenantUuid, user.sub, dto);
  }
}
