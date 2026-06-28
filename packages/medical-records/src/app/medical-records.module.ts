import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from '@medical-records/infrastructure/adapters/prisma/prisma.service';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { PatientController } from './controllers/patient.controllers';
import { CreatePatientUseCase } from '@medical-records/domain/use-cases/create-patient.use-case';
import { GetPatientsUseCase } from '@medical-records/domain/use-cases/get-patients.use-case';
import { GetPatientByUuidUseCase } from '@medical-records/domain/use-cases/get-patient-by-uuid.use-case';
import { MedicalControlStorage } from '@medical-records/infrastructure/adapters/controlRepository/medical-control.storage';
import { CreateMedicalControlUseCase } from '@medical-records/domain/use-cases/medical-control/create-medical-control.use-case';
import { FindAllMedicalControlsUseCase } from '@medical-records/domain/use-cases/medical-control/find-all-medical-controls.use-case';
import { FindOneMedicalControlUseCase } from '@medical-records/domain/use-cases/medical-control/find-one-medical-control.use-case';
import { MedicalControlController } from './controllers/medical-control.controller';
import { AppointmentController } from './controllers/appointments.controllers';
import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';
import { CreateAppointmentUseCase } from '@medical-records/domain/use-cases/appointments/create-appointment.use-case';
import { UpdateAppointmentUseCase } from '@medical-records/domain/use-cases/appointments/update-appointment.use-case';
import { FindOneAppointment } from '@medical-records/domain/use-cases/appointments/find-one-appointment.use-case';
import { GetAppointmentsUseCase } from '@medical-records/domain/use-cases/appointments/find-all-appointment.use-case';
import { GetAppointmentsByPatientUseCase } from '@medical-records/domain/use-cases/appointments/find-byPatient-appointment.use-case';
import { DeleteAppointmentUseCase } from '@medical-records/domain/use-cases/appointments/delete-appointment.use-case';
import { ProductController } from './controllers/inventory.controller';
import { ProductStorage } from '@medical-records/infrastructure/adapters/inventoryRepository/inventory.storage';
import { ProductManagerUseCase } from '@medical-records/domain/use-cases/inventory/inventory.use-case';
import { AppointmentTypeController } from './controllers/appointment-type.controller';
import { AppointmentTypeStorage } from '@medical-records/infrastructure/adapters/appointmentTypesRepository/appointment-type.storage';
import { FindAllAppointmentTypesUseCase } from '@medical-records/domain/use-cases/appointment-types/find-all-appointment-types.use-case';
import { CreateAppointmentTypeUseCase } from '@medical-records/domain/use-cases/appointment-types/create-appointment-type.use-case';
import { InitializeAppointmentTypesUseCase } from '@medical-records/domain/use-cases/appointment-types/initialize-appointment-types.use-case';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [
    PatientController,
    MedicalControlController,
    AppointmentController,
    ProductController,
    AppointmentTypeController,
  ],
  providers: [
    PrismaService,

    PatientStorage,
    MedicalControlStorage,
    AppointmentStorage,
    ProductStorage,

    CreatePatientUseCase,
    GetPatientsUseCase,
    GetPatientByUuidUseCase,

    CreateMedicalControlUseCase,
    FindAllMedicalControlsUseCase,
    FindOneMedicalControlUseCase,

    CreateAppointmentUseCase,
    UpdateAppointmentUseCase,
    FindOneAppointment,
    GetAppointmentsUseCase,
    GetAppointmentsByPatientUseCase,
    DeleteAppointmentUseCase,

    ProductManagerUseCase,

    AppointmentTypeStorage,
    FindAllAppointmentTypesUseCase,
    CreateAppointmentTypeUseCase,
    InitializeAppointmentTypesUseCase,
  ],
  exports: [PrismaService, PatientStorage, AppointmentStorage],
})
export class MedicalRecordsModule {}
