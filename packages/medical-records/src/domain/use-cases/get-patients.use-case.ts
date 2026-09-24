import {
  PatientStorage,
  PatientWithNextAppointment,
} from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { Injectable } from '@nestjs/common';
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
    nextAppointmentMonth?: string,
  ): Promise<PaginatedResponse<PatientWithNextAppointment>> {
    return await this.patientStorage.findAllByTenant(
      tenantUUID,
      page,
      limit,
      includeInactive,
      search,
      nextAppointmentMonth,
    );
  }
}
