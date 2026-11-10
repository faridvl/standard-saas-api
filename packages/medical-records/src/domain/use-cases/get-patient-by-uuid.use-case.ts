import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientRecord } from '@medical-records/domain/types/patient-record.type';
import { filterPatientClinicalFields } from '@medical-records/domain/policies/patient-clinical-fields.policy';

@Injectable()
export class GetPatientByUuidUseCase {
  constructor(private readonly patientStorage: PatientStorage) {}

  async execute(uuid: string, tenantUuid: string, attendsPatients = false): Promise<PatientRecord> {
    const patient = await this.patientStorage.findByUuid(uuid, tenantUuid);

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    return filterPatientClinicalFields(patient, attendsPatients);
  }
}
