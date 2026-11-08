import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientAudiometryEntryStorage } from '@medical-records/infrastructure/adapters/patientAudiometryEntryRepository/patient-audiometry-entry.storage';
import { PatientAudiometryEntrySummary } from '@medical-records/domain/entities/patient-audiometry-entry.entity';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';

@Injectable()
export class FindPatientAudiometryEntriesUseCase {
  constructor(
    private readonly storage: PatientAudiometryEntryStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
  ) {}

  async execute(patientUuid: string, tenantUuid: string): Promise<PatientAudiometryEntrySummary[]> {
    if (!(await this.storage.patientExists(patientUuid, tenantUuid))) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const records = await this.storage.findAllByPatient(patientUuid, tenantUuid);
    const authorUuids = [...new Set(records.map((record) => record.createdByUuid))];
    const names = new Map(
      await Promise.all(
        authorUuids.map(
          async (uuid) => [uuid, await this.getOrCreateUser.execute(uuid, tenantUuid)] as const,
        ),
      ),
    );

    return records.map((record) => ({
      ...record,
      createdByName: names.get(record.createdByUuid) ?? null,
    }));
  }
}
