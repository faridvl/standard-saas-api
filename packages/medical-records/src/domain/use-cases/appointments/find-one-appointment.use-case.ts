import { Appointment } from '@medical-records/domain/types/appointment.types';
import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FindOneAppointment {
  constructor(private readonly storage: AppointmentStorage) {}

  async execute(uuid: string, tenantUUID: string): Promise<Appointment> {
    return this.storage.findOne(uuid, tenantUUID);
  }
}
