import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { Injectable } from '@nestjs/common';
import { Patient } from '@prisma/client';
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
  ): Promise<PaginatedResponse<Patient & { nextAppointmentAt: Date | null }>> {
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
