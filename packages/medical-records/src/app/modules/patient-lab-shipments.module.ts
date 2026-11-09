import { Module } from '@nestjs/common';
import { UsersModule } from './users.module';
import { PatientLabShipmentController } from '../controllers/patient-lab-shipment.controller';
import { PatientLabShipmentStorage } from '@medical-records/infrastructure/adapters/patientLabShipmentRepository/patient-lab-shipment.storage';
import { FindPatientLabShipmentsUseCase } from '@medical-records/domain/use-cases/patient-lab-shipments';

const CONTROLLERS = [PatientLabShipmentController];
const USE_CASES = [FindPatientLabShipmentsUseCase];
const STORAGES = [PatientLabShipmentStorage];

@Module({
  imports: [UsersModule],
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
  exports: [...STORAGES],
})
export class PatientLabShipmentsModule {}
