import { Injectable } from '@nestjs/common';
import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';

@Injectable()
export class FindScheduledMonthsUseCase {
  constructor(private readonly storage: AppointmentStorage) {}

  async execute(tenantUUID: string): Promise<string[]> {
    return this.storage.findScheduledMonths(tenantUUID);
  }
}
