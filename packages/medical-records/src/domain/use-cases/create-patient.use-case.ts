import { Injectable, ConflictException } from '@nestjs/common';
import { PatientRecord } from '@medical-records/domain/types/patient-record.type';
import { PatientStorage } from '../../infrastructure/adapters/patientsRepository/patient.storage';
import { BranchStorage } from '@medical-records/infrastructure/adapters/branchRepository/branch.storage';
import {
  assertBranchesActive,
  assertBranchesExist,
  resolvePatientBranches,
} from '@medical-records/domain/services/patient-branches';
import { PatientContactStorage } from '@medical-records/infrastructure/adapters/patientContactRepository/patient-contact.storage';
import { PatientEntity } from '../entities/patient.entity';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';
import { stripPatientClinicalWrites } from '@medical-records/domain/policies/patient-clinical-fields.policy';

@Injectable()
export class CreatePatientUseCase {
  constructor(
    private readonly storage: PatientStorage,
    private readonly contactStorage: PatientContactStorage,
    private readonly branchStorage: BranchStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    input: Omit<PatientEntity, 'tenantId' | 'tenantUuid' | 'createdBy'>,
    userContext: { tenantId: number; tenantUuid: string; sub: string; attendsPatients: boolean },
  ): Promise<PatientRecord> {
    const data = stripPatientClinicalWrites(input, userContext.attendsPatients);
    if (data.documentId) {
      const existing = await this.storage.findByDocumentId(data.documentId, userContext.tenantUuid);
      if (existing) {
        throw new ConflictException(
          `La cédula ${data.documentId} ya está registrada (paciente: ${existing.firstName} ${existing.lastName})`,
        );
      }
    }

    const branches = resolvePatientBranches({
      branchUuid: data.branchUuid,
      branchUuids: data.branchUuids,
    }) ?? { branchUuid: null, branchUuids: [] };
    assertBranchesExist(
      branches.branchUuids,
      await this.branchStorage.findUuidsInTenant(userContext.tenantUuid, branches.branchUuids),
    );
    assertBranchesActive(
      branches.branchUuids,
      await this.branchStorage.findInactiveUuids(userContext.tenantUuid, branches.branchUuids),
    );

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
      tenantId: userContext.tenantId,
      tenantUuid: userContext.tenantUuid,
      createdBy: userContext.sub,
    };

    const patient = await this.storage.saveWithBranches(patientData, branches);

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

    await this.recordActivity.execute({
      tenantUuid: userContext.tenantUuid,
      patientUuid: patient.uuid,
      actorUuid: userContext.sub,
      action: PatientActivityAction.PATIENT_CREATED,
    });

    return patient;
  }
}
