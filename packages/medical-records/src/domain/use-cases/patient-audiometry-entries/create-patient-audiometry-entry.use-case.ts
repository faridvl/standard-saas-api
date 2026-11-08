import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientAudiometryEntryStorage } from '@medical-records/infrastructure/adapters/patientAudiometryEntryRepository/patient-audiometry-entry.storage';
import { CreatePatientAudiometryEntryDto } from '@medical-records/app/dtos/patient-audiometry-entry.dto';
import { PatientAudiometryEntryEntity } from '@medical-records/domain/entities/patient-audiometry-entry.entity';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';

@Injectable()
export class CreatePatientAudiometryEntryUseCase {
  constructor(
    private readonly storage: PatientAudiometryEntryStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
  ) {}

  async execute(
    patientUuid: string,
    tenantUuid: string,
    actorUuid: string,
    dto: CreatePatientAudiometryEntryDto,
  ): Promise<PatientAudiometryEntryEntity> {
    if (!(await this.storage.patientExists(patientUuid, tenantUuid))) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const saved = await this.storage.create({
      tenantUuid,
      patientUuid,
      createdByUuid: actorUuid,
      schemaVersion: dto.schemaVersion,
      payload: dto.payload,
    });

    const createdByName = await this.getOrCreateUser.execute(actorUuid, tenantUuid);
    return { ...saved, createdByName, invalidatedByName: null };
  }
}
