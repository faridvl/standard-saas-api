import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientBackgroundStorage } from '@medical-records/infrastructure/adapters/patientBackgroundRepository/patient-background.storage';
import { PatientBackgroundEntity } from '@medical-records/domain/entities/patient-background.entity';

@Injectable()
export class FindPatientBackgroundUseCase {
  constructor(private readonly storage: PatientBackgroundStorage) {}

  async execute(patientUuid: string, tenantUuid: string): Promise<PatientBackgroundEntity | null> {
    if (!(await this.storage.patientExists(patientUuid, tenantUuid))) {
      throw new NotFoundException('Paciente no encontrado');
    }
    return this.storage.findByPatient(patientUuid);
  }
}
