import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientPhysicalExamStorage } from '@medical-records/infrastructure/adapters/patientPhysicalExamRepository/patient-physical-exam.storage';
import { PatientPhysicalExamEntity } from '@medical-records/domain/entities/patient-physical-exam.entity';

@Injectable()
export class FindPatientPhysicalExamUseCase {
  constructor(private readonly storage: PatientPhysicalExamStorage) {}

  async execute(
    patientUuid: string,
    tenantUuid: string,
  ): Promise<PatientPhysicalExamEntity | null> {
    if (!(await this.storage.patientExists(patientUuid, tenantUuid))) {
      throw new NotFoundException('Paciente no encontrado');
    }
    return this.storage.findByPatient(patientUuid);
  }
}
