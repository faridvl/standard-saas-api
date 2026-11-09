import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PatientAudiometryEntryStorage } from '@medical-records/infrastructure/adapters/patientAudiometryEntryRepository/patient-audiometry-entry.storage';
import { PatientAudiometryEntryEntity } from '@medical-records/domain/entities/patient-audiometry-entry.entity';
import { FindPatientAudiometryEntryUseCase } from './find-patient-audiometry-entry.use-case';

const ALREADY_INVALIDATED_MESSAGE = 'La audiometría ya está marcada como mal hecha';

@Injectable()
export class InvalidatePatientAudiometryEntryUseCase {
  constructor(
    private readonly storage: PatientAudiometryEntryStorage,
    private readonly findOne: FindPatientAudiometryEntryUseCase,
  ) {}

  async execute(
    patientUuid: string,
    entryUuid: string,
    tenantUuid: string,
    actorUuid: string,
    reason: string,
  ): Promise<PatientAudiometryEntryEntity> {
    const existing = await this.storage.findByUuid(entryUuid, patientUuid, tenantUuid);
    if (!existing) {
      throw new NotFoundException('Audiometría no encontrada');
    }
    if (existing.invalidatedAt) {
      throw new ConflictException(ALREADY_INVALIDATED_MESSAGE);
    }

    const updated = await this.storage.invalidate(
      entryUuid,
      patientUuid,
      tenantUuid,
      actorUuid,
      reason,
    );
    // Dos marcas casi simultáneas: gana una; la otra no encuentra fila sin marcar.
    if (!updated) {
      throw new ConflictException(ALREADY_INVALIDATED_MESSAGE);
    }
    return await this.findOne.execute(patientUuid, entryUuid, tenantUuid);
  }
}
