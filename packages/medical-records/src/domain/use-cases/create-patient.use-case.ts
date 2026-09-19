import { Injectable, ConflictException } from '@nestjs/common';
import { Patient } from '@prisma/client';
import { PatientStorage } from '../../infrastructure/adapters/patientsRepository/patient.storage';
import { PatientContactStorage } from '@medical-records/infrastructure/adapters/patientContactRepository/patient-contact.storage';
import { PatientEntity } from '../entities/patient.entity';

@Injectable()
export class CreatePatientUseCase {
  constructor(
    private readonly storage: PatientStorage,
    private readonly contactStorage: PatientContactStorage,
  ) {}

  async execute(
    data: Omit<PatientEntity, 'tenantId' | 'tenantUuid' | 'createdBy'>,
    userContext: { tenantId: number; tenantUuid: string; sub: string },
  ): Promise<Patient> {
    if (data.documentId) {
      const existing = await this.storage.findByDocumentId(data.documentId, userContext.tenantUuid);
      if (existing) {
        throw new ConflictException(
          `La cédula ${data.documentId} ya está registrada (paciente: ${existing.firstName} ${existing.lastName})`,
        );
      }
    }

    const patientData = {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      address: data.address,
      birthDate: data.birthDate,
      email: data.email,
      gender: data.gender,
      bloodType: data.bloodType,
      documentId: data.documentId,
      branchUuid: data.branchUuid,
      tenantId: userContext.tenantId,
      tenantUuid: userContext.tenantUuid,
      createdBy: userContext.sub,
    };

    const patient = await this.storage.save(patientData);

    if (data.contacts && data.contacts.length > 0) {
      await this.contactStorage.createMany(
        data.contacts.map((contact) => ({
          patientUuid: patient.uuid,
          tenantUuid: userContext.tenantUuid,
          name: contact.name,
          phone: contact.phone,
        })),
      );
    }

    return patient;
  }
}
