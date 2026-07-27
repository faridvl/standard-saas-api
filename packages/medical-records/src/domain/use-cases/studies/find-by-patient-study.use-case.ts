import { Injectable } from '@nestjs/common';
import { StudyStorage } from '@medical-records/infrastructure/adapters/studyRepository/study.storage';
import { StudyEntity } from '@medical-records/domain/entities/study.entity';

@Injectable()
export class FindByPatientStudyUseCase {
  constructor(private readonly storage: StudyStorage) {}

  // El expediente es del paciente, no del médico (NOM-004 5.14): no se filtra
  // por especialidad de quien lee.
  async execute(patientUuid: string, tenantUuid: string): Promise<StudyEntity[]> {
    return this.storage.findAllByPatient(patientUuid, tenantUuid);
  }
}
