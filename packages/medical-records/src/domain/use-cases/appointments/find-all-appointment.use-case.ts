import { Appointment } from '@medical-records/domain/types/appointment.types';
import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';
import { Injectable } from '@nestjs/common';
import { PaginatedResponse } from '@project/core/domain/types/pagination.types';

@Injectable()
export class GetAppointmentsUseCase {
  constructor(private readonly storage: AppointmentStorage) {}

  async execute(
    tenantUUID: string,
    query: { page?: string; limit?: string; date?: string; patientId?: string },
  ): Promise<PaginatedResponse<Appointment>> {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);

    return this.storage.findAll(tenantUUID, {
      page: page > 0 ? page : 1,
      limit: limit > 0 ? limit : 10,
      date: query.date,
      patientId: query.patientId,
    });
  }
}
