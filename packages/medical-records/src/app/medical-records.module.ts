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
import { DeleteAppointmentTypeUseCase } from '@medical-records/domain/use-cases/appointment-types/delete-appointment-type.use-case';
import { ClinicalTemplateController } from './controllers/clinical-template.controller';
import { ClinicalTemplateStorage } from '@medical-records/infrastructure/adapters/clinicalTemplateRepository/clinical-template.storage';
import { CreateClinicalTemplateUseCase } from '@medical-records/domain/use-cases/clinical-templates/create-clinical-template.use-case';
import { FindAllClinicalTemplatesUseCase } from '@medical-records/domain/use-cases/clinical-templates/find-all-clinical-templates.use-case';
import { FindClinicalTemplateBySpecialityUseCase } from '@medical-records/domain/use-cases/clinical-templates/find-clinical-template-by-speciality.use-case';
import { FindAllClinicalTemplatesBySpecialityUseCase } from '@medical-records/domain/use-cases/clinical-templates/find-all-clinical-templates-by-speciality.use-case';
import { UpdateClinicalTemplateUseCase } from '@medical-records/domain/use-cases/clinical-templates/update-clinical-template.use-case';
import { DeleteClinicalTemplateUseCase } from '@medical-records/domain/use-cases/clinical-templates/delete-clinical-template.use-case';
import { UpdatePatientUseCase } from '@medical-records/domain/use-cases/update-patient.use-case';
import { MaintenanceController } from './controllers/maintenance.controller';
import { MaintenanceStorage } from '@medical-records/infrastructure/adapters/maintenanceRepository/maintenance.storage';
import { CreateMaintenanceUseCase } from '@medical-records/domain/use-cases/maintenance/create-maintenance.use-case';
import { FindByPatientMaintenanceUseCase } from '@medical-records/domain/use-cases/maintenance/find-by-patient-maintenance.use-case';
import { FindUpcomingMaintenanceUseCase } from '@medical-records/domain/use-cases/maintenance/find-upcoming-maintenance.use-case';
import { PatientBackgroundStorage } from '@medical-records/infrastructure/adapters/patientBackgroundRepository/patient-background.storage';
import { FindPatientBackgroundUseCase } from '@medical-records/domain/use-cases/patient-background/find-patient-background.use-case';
import { UpsertPatientBackgroundUseCase } from '@medical-records/domain/use-cases/patient-background/upsert-patient-background.use-case';
import { SoftDeletePatientUseCase } from '@medical-records/domain/use-cases/soft-delete-patient.use-case';
import { BulkImportPatientsUseCase } from '@medical-records/domain/use-cases/bulk-import-patients.use-case';
import { AddCorrectionNoteUseCase } from '@medical-records/domain/use-cases/medical-control/add-correction-note.use-case';
import { PatientDeviceStorage } from '@medical-records/infrastructure/adapters/patientDeviceRepository/patient-device.storage';
import { CreatePatientDeviceUseCase } from '@medical-records/domain/use-cases/patient-device/create-patient-device.use-case';
import { FindPatientDevicesUseCase } from '@medical-records/domain/use-cases/patient-device/find-patient-devices.use-case';
import { DeactivatePatientDeviceUseCase } from '@medical-records/domain/use-cases/patient-device/deactivate-patient-device.use-case';
import { PatientDeviceController } from './controllers/patient-device.controller';
import { ProductUnitStorage } from '@medical-records/infrastructure/adapters/productUnitRepository/product-unit.storage';
import { CreateProductUnitUseCase } from '@medical-records/domain/use-cases/product-unit/create-product-unit.use-case';
import { CreateProductUnitsBulkUseCase } from '@medical-records/domain/use-cases/product-unit/create-product-units-bulk.use-case';
import { FindProductUnitsUseCase } from '@medical-records/domain/use-cases/product-unit/find-product-units.use-case';
import { FindOneProductUnitUseCase } from '@medical-records/domain/use-cases/product-unit/find-one-product-unit.use-case';
import { UpdateProductUnitUseCase } from '@medical-records/domain/use-cases/product-unit/update-product-unit.use-case';
import { ProductUnitController } from './controllers/product-unit.controller';
import { StorageModule } from '@project/core';
import { UploadController } from './controllers/upload.controller';
import { PatientDocumentController } from './controllers/patient-document.controller';
import { PatientDocumentStorage } from '@medical-records/infrastructure/adapters/patientDocumentRepository/patient-document.storage';
import { FindPatientDocumentsUseCase } from '@medical-records/domain/use-cases/patient-documents/find-patient-documents.use-case';
import { CreatePatientDocumentUseCase } from '@medical-records/domain/use-cases/patient-documents/create-patient-document.use-case';
import { DeletePatientDocumentUseCase } from '@medical-records/domain/use-cases/patient-documents/delete-patient-document.use-case';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StorageModule,
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
    UploadController,
    MedicalControlController,
    AppointmentController,
    ProductController,
    AppointmentTypeController,
    ClinicalTemplateController,
    MaintenanceController,
    PatientDeviceController,
    PatientDocumentController,
    ProductUnitController,
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
    DeleteAppointmentTypeUseCase,

    ClinicalTemplateStorage,
    CreateClinicalTemplateUseCase,
    FindAllClinicalTemplatesUseCase,
    FindClinicalTemplateBySpecialityUseCase,
    FindAllClinicalTemplatesBySpecialityUseCase,
    UpdateClinicalTemplateUseCase,
    DeleteClinicalTemplateUseCase,

    UpdatePatientUseCase,

    MaintenanceStorage,
    CreateMaintenanceUseCase,
    FindByPatientMaintenanceUseCase,
    FindUpcomingMaintenanceUseCase,

    PatientBackgroundStorage,
    FindPatientBackgroundUseCase,
    UpsertPatientBackgroundUseCase,

    SoftDeletePatientUseCase,
    BulkImportPatientsUseCase,
    AddCorrectionNoteUseCase,

    PatientDeviceStorage,
    CreatePatientDeviceUseCase,
    FindPatientDevicesUseCase,
    DeactivatePatientDeviceUseCase,

    ProductUnitStorage,
    CreateProductUnitUseCase,
    CreateProductUnitsBulkUseCase,
    FindProductUnitsUseCase,
    FindOneProductUnitUseCase,
    UpdateProductUnitUseCase,

    PatientDocumentStorage,
    FindPatientDocumentsUseCase,
    CreatePatientDocumentUseCase,
    DeletePatientDocumentUseCase,
  ],
  exports: [PrismaService, PatientStorage, AppointmentStorage],
})
export class MedicalRecordsModule {}
