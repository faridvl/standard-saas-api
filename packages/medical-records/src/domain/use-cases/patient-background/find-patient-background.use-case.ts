import { Injectable } from '@nestjs/common';
import { PatientBackgroundStorage } from '@medical-records/infrastructure/adapters/patientBackgroundRepository/patient-background.storage';
import { PatientBackgroundEntity } from '@medical-records/domain/entities/patient-background.entity';

@Injectable()
export class FindPatientBackgroundUseCase {
  constructor(private readonly storage: PatientBackgroundStorage) {}

  async execute(patientUuid: string): Promise<PatientBackgroundEntity | null> {
    return this.storage.findByPatient(patientUuid);
  }
}
