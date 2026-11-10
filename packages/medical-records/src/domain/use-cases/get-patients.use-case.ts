import {
  PatientListFilters,
  PatientStorage,
  PatientWithNextAppointment,
} from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { Injectable } from '@nestjs/common';
import { filterPatientClinicalFields } from '@medical-records/domain/policies/patient-clinical-fields.policy';
import { PaginatedResponse } from '@project/core/domain/types/pagination.types';

@Injectable()
export class GetPatientsUseCase {
  constructor(private readonly patientStorage: PatientStorage) {}

  async execute(
    tenantUUID: string,
    page: number,
    limit: number,
    includeInactive = false,
    search?: string,
    nextAppointmentMonths?: string[],
    filters: PatientListFilters = {},
    attendsPatients = false,
  ): Promise<PaginatedResponse<PatientWithNextAppointment>> {
    const result = await this.patientStorage.findAllByTenant(
      tenantUUID,
      page,
      limit,
      includeInactive,
      search,
      nextAppointmentMonths,
      filters,
    );
    return {
      ...result,
      data: result.data.map((patient) => filterPatientClinicalFields(patient, attendsPatients)),
    };
  }
}
