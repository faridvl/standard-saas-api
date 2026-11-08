import { Injectable } from '@nestjs/common';
import {
  PatientStorage,
  StalePatient,
} from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { staleCutoff } from '@medical-records/domain/utils/stale-patient.util';

/** Pacientes de la clínica sin movimiento hace `STALE_PATIENT_MONTHS` meses o más. */
@Injectable()
export class GetStalePatientsUseCase {
  constructor(private readonly patientStorage: PatientStorage) {}

  async execute(tenantUuid: string, now: Date = new Date()): Promise<StalePatient[]> {
    return await this.patientStorage.findStaleByTenant(tenantUuid, staleCutoff(now));
  }
}
