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
    return await this.storage.save({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      address: data.address,
      birthDate: data.birthDate,
      email: data.email,
      gender: data.gender,
      bloodType: data.bloodType,
      documentId: data.documentId,
      tenantId: userContext.tenantId,
      tenantUuid: userContext.tenantUuid,
      createdBy: userContext.sub,
    });
  }
}
