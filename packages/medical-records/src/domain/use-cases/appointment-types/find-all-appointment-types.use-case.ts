import { Injectable } from '@nestjs/common';
import { AppointmentTypeStorage } from '@medical-records/infrastructure/adapters/appointmentTypesRepository/appointment-type.storage';
import { AppointmentTypeEntity } from '@medical-records/domain/entities/appointment-type.entity';

@Injectable()
export class FindAllAppointmentTypesUseCase {
  constructor(private readonly storage: AppointmentTypeStorage) {}

  async execute(tenantUUID: string): Promise<AppointmentTypeEntity[]> {
    return await this.storage.findAll(tenantUUID);
  }
}
