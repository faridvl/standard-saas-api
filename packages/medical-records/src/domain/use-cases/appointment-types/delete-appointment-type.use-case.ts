import { Injectable } from '@nestjs/common';
import { AppointmentTypeStorage } from '@medical-records/infrastructure/adapters/appointmentTypesRepository/appointment-type.storage';

@Injectable()
export class DeleteAppointmentTypeUseCase {
  constructor(private readonly storage: AppointmentTypeStorage) {}

  async execute(tenantUUID: string, uuid: string): Promise<void> {
    await this.storage.delete(tenantUUID, uuid);
  }
}
