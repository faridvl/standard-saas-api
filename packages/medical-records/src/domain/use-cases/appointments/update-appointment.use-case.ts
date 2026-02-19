import { UpdateAppointmentDto } from '@medical-records/app/dtos/appointment.dto';
import { Appointment } from '@medical-records/domain/types/appointment.types';
import { AppointmentStorage } from '@medical-records/infrastructure/adapters/appointmentsRepository/appointments.storage';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UpdateAppointmentUseCase {
  constructor(private readonly storage: AppointmentStorage) {}

  async execute(uuid: string, tenantUUID: string, dto: UpdateAppointmentDto): Promise<Appointment> {
    await this.storage.findOne(uuid, tenantUUID);

    const updateData: Partial<Appointment> = {
      status: dto.status,
      notes: dto.notes,
      ...(dto.startTime &&
        dto.endTime && {
          schedule: {
            date: new Date(dto.date || new Date()),
            startTime: new Date(dto.startTime),
            endTime: new Date(dto.endTime),
          },
        }),
    };

    return this.storage.update(uuid, tenantUUID, updateData);
  }
}
