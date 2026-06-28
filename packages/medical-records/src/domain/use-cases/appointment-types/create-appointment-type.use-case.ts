import { Injectable } from '@nestjs/common';
import { AppointmentTypeStorage } from '@medical-records/infrastructure/adapters/appointmentTypesRepository/appointment-type.storage';
import { CreateAppointmentTypeDto } from '@medical-records/app/dtos/appointment-type.dto';

@Injectable()
export class CreateAppointmentTypeUseCase {
  constructor(private readonly storage: AppointmentTypeStorage) {}

  async execute(tenantUUID: string, dto: CreateAppointmentTypeDto) {
    return await this.storage.create(tenantUUID, dto);
  }
}
