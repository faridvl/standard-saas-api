import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientAudiometryEntryStorage } from '@medical-records/infrastructure/adapters/patientAudiometryEntryRepository/patient-audiometry-entry.storage';
import { PatientAudiometryEntryEntity } from '@medical-records/domain/entities/patient-audiometry-entry.entity';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';

@Injectable()
export class FindPatientAudiometryEntryUseCase {
  constructor(
    private readonly storage: PatientAudiometryEntryStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
  ) {}

  async execute(
    patientUuid: string,
    entryUuid: string,
    tenantUuid: string,
  ): Promise<PatientAudiometryEntryEntity> {
    const record = await this.storage.findByUuid(entryUuid, patientUuid, tenantUuid);
    if (!record) {
      throw new NotFoundException('Audiometría no encontrada');
    }
    const createdByName = await this.getOrCreateUser.execute(record.createdByUuid, tenantUuid);
    return { ...record, createdByName };
  }
}
