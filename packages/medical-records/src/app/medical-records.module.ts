import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@medical-records/infrastructure/adapters/prisma/prisma.module';
import { PatientsModule } from './modules/patients.module';
import { PatientContactsModule } from './modules/patient-contacts.module';
import { PatientNotesModule } from './modules/patient-notes.module';
import { PatientBackgroundModule } from './modules/patient-background.module';
import { PatientDeviceModule } from './modules/patient-device.module';
import { PatientDocumentsModule } from './modules/patient-documents.module';
import { AppointmentsModule } from './modules/appointments.module';
import { AppointmentTypesModule } from './modules/appointment-types.module';
import { MedicalControlModule } from './modules/medical-control.module';
import { ClinicalTemplatesModule } from './modules/clinical-templates.module';
import { MaintenanceModule } from './modules/maintenance.module';
import { EncountersModule } from './modules/encounters.module';
import { StudiesModule } from './modules/studies.module';
import { BranchesModule } from './modules/branches.module';
import { InventoryModule } from './modules/inventory.module';
import { ProductUnitModule } from './modules/product-unit.module';
import { UsersModule } from './modules/users.module';
import { UploadModule } from './modules/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    PrismaModule,
    PatientsModule,
    PatientContactsModule,
    PatientNotesModule,
    PatientBackgroundModule,
    PatientDeviceModule,
    PatientDocumentsModule,
    AppointmentsModule,
    AppointmentTypesModule,
    MedicalControlModule,
    ClinicalTemplatesModule,
    MaintenanceModule,
    EncountersModule,
    StudiesModule,
    BranchesModule,
    InventoryModule,
    ProductUnitModule,
    UsersModule,
    UploadModule,
  ],
})
export class MedicalRecordsModule {}
