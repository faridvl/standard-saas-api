import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateAppointmentTypeDto } from '@medical-records/app/dtos/appointment-type.dto';
import { AppointmentTypeEntity } from '@medical-records/domain/entities/appointment-type.entity';
import { AppointmentTypeStorage } from '@medical-records/infrastructure/adapters/appointmentTypesRepository/appointment-type.storage';

@Injectable()
export class UpdateAppointmentTypeUseCase {
  constructor(private readonly storage: AppointmentTypeStorage) {}

  async execute(
    tenantUUID: string,
    uuid: string,
    dto: UpdateAppointmentTypeDto,
  ): Promise<AppointmentTypeEntity> {
    const updated = await this.storage.update(tenantUUID, uuid, dto);
    if (!updated) throw new NotFoundException('Tipo de cita no encontrado');
    return updated;
  }
}
