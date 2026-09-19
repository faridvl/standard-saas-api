import { Module } from '@nestjs/common';
import { PatientDeviceController } from '../controllers/patient-device.controller';
import { PatientDeviceStorage } from '@medical-records/infrastructure/adapters/patientDeviceRepository/patient-device.storage';
import {
  CreatePatientDeviceUseCase,
  FindPatientDevicesUseCase,
  DeactivatePatientDeviceUseCase,
} from '@medical-records/domain/use-cases/patient-device';
import { ProductUnitModule } from './product-unit.module';

const CONTROLLERS = [PatientDeviceController];
const USE_CASES = [
  CreatePatientDeviceUseCase,
  FindPatientDevicesUseCase,
  DeactivatePatientDeviceUseCase,
];
const STORAGES = [PatientDeviceStorage];

@Module({
  imports: [ProductUnitModule],
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class PatientDeviceModule {}
