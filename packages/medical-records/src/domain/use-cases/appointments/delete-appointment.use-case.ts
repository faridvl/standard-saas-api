import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DeleteAppointmentUseCase {
  constructor(private readonly storage: AppointmentStorage) {}

  async execute(uuid: string, tenantUUID: string): Promise<{ success: boolean }> {
    await this.storage.findOne(uuid, tenantUUID);
    return this.storage.delete(uuid, tenantUUID);
  }
}
