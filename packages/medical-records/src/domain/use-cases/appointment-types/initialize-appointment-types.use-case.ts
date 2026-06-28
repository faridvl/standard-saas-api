import { Injectable } from '@nestjs/common';
import { AppointmentTypeStorage } from '@medical-records/infrastructure/adapters/appointmentTypesRepository/appointment-type.storage';
import { AppointmentTypeEntity } from '@medical-records/domain/entities/appointment-type.entity';

const DEFAULT_APPOINTMENT_TYPES = [
  { name: 'Consulta General', duration: 30, color: '#4A90E2' },
  { name: 'Audiometría Tonal', duration: 60, color: '#7B68EE' },
  { name: 'Control de Seguimiento', duration: 20, color: '#50C878' },
];

@Injectable()
export class InitializeAppointmentTypesUseCase {
  constructor(private readonly storage: AppointmentTypeStorage) {}

  async execute(tenantUuid: string): Promise<AppointmentTypeEntity[]> {
    const existing = await this.storage.findAll(tenantUuid);

    if (existing.length > 0) {
      return existing;
    }

    const created: AppointmentTypeEntity[] = [];

    for (const typeData of DEFAULT_APPOINTMENT_TYPES) {
      const appointmentType = await this.storage.create(tenantUuid, typeData);
      created.push(appointmentType);
    }

    return created;
  }
}
