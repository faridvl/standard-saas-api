import { Module } from '@nestjs/common';
import { AppointmentTypeController } from '../controllers/appointment-type.controller';
import { AppointmentTypeStorage } from '@medical-records/infrastructure/adapters/appointmentTypesRepository/appointment-type.storage';
import {
  FindAllAppointmentTypesUseCase,
  CreateAppointmentTypeUseCase,
  InitializeAppointmentTypesUseCase,
  DeleteAppointmentTypeUseCase,
} from '@medical-records/domain/use-cases/appointment-types';

const CONTROLLERS = [AppointmentTypeController];
const USE_CASES = [
  FindAllAppointmentTypesUseCase,
  CreateAppointmentTypeUseCase,
  InitializeAppointmentTypesUseCase,
  DeleteAppointmentTypeUseCase,
];
const STORAGES = [AppointmentTypeStorage];

@Module({
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class AppointmentTypesModule {}
