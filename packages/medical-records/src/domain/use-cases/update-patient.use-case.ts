import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientStorage } from '@medical-records/infrastructure/adapters/patientsRepository/patient.storage';
import { UpdatePatientDto } from '@medical-records/app/dtos/update-patient.dto';

@Injectable()
export class UpdatePatientUseCase {
  constructor(private readonly storage: PatientStorage) {}

  async execute(uuid: string, tenantUuid: string, dto: UpdatePatientDto) {
    const existing = await this.storage.findByUuid(uuid, tenantUuid);
    if (!existing) {
      throw new NotFoundException(`Paciente con UUID ${uuid} no encontrado`);
    }
    return await this.storage.update(uuid, tenantUuid, dto);
  }
}
