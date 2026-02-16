import { Injectable } from '@nestjs/common';
import { PatientStorage } from '../../infrastructure/adapters/patientsRepository/patient.storage';
import { PatientEntity } from '../entities/patient.entity';

@Injectable()
export class CreatePatientUseCase {
  constructor(private readonly storage: PatientStorage) {}

  async execute(
    data: Omit<PatientEntity, 'tenantId' | 'tenantUuid' | 'createdBy'>,
    userContext: { tenantId: number; tenantUuid: string; sub: string },
  ) {
    const newPatient: PatientEntity = {
      ...data,
      tenantId: userContext.tenantId,
      tenantUuid: userContext.tenantUuid,
      createdBy: userContext.sub,
    };

    return await this.storage.save(newPatient);
  }
}
