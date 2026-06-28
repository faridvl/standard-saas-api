import { Injectable } from '@nestjs/common';
import { AppointmentTypeStorage } from '@medical-records/infrastructure/adapters/appointmentTypesRepository/appointment-type.storage';

@Injectable()
export class FindAllAppointmentTypesUseCase {
  constructor(private readonly storage: AppointmentTypeStorage) {}

  async execute(tenantUUID: string) {
    return await this.storage.findAll(tenantUUID);
  }
}
