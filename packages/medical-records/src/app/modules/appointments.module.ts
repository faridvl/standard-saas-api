import { Module } from '@nestjs/common';
import { PatientActivityModule } from './patient-activity.module';
import { AppointmentController } from '../controllers/appointments.controllers';
import { NextAppointmentController } from '../controllers/next-appointment.controller';
import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';
import {
  CreateAppointmentUseCase,
  UpdateAppointmentUseCase,
  FindOneAppointment,
  GetAppointmentsUseCase,
  GetAppointmentsByPatientUseCase,
  DeleteAppointmentUseCase,
  FindScheduledMonthsUseCase,
  ScheduleNextAppointmentUseCase,
  SetTentativeMonthUseCase,
} from '@medical-records/domain/use-cases/appointments';
import { ExpireAppointmentsJob } from '@medical-records/infrastructure/jobs/expire-appointments.job';
import { PatientsModule } from './patients.module';
import { AppointmentTypesModule } from './appointment-types.module';

const CONTROLLERS = [AppointmentController, NextAppointmentController];
const USE_CASES = [
  CreateAppointmentUseCase,
  UpdateAppointmentUseCase,
  FindOneAppointment,
  GetAppointmentsUseCase,
  GetAppointmentsByPatientUseCase,
  DeleteAppointmentUseCase,
  ScheduleNextAppointmentUseCase,
  SetTentativeMonthUseCase,
  FindScheduledMonthsUseCase,
];
const STORAGES = [AppointmentStorage];

@Module({
  imports: [PatientsModule, AppointmentTypesModule, PatientActivityModule],
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES, ExpireAppointmentsJob],
  exports: [...STORAGES],
})
export class AppointmentsModule {}
