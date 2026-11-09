import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PatientAudiometryEntryStorage } from '@medical-records/infrastructure/adapters/patientAudiometryEntryRepository/patient-audiometry-entry.storage';
import { CreatePatientAudiometryEntryDto } from '@medical-records/app/dtos/patient-audiometry-entry.dto';
import { PatientAudiometryEntryEntity } from '@medical-records/domain/entities/patient-audiometry-entry.entity';
import { AudiometryTypeStorage } from '@medical-records/infrastructure/adapters/audiometryTypeRepository/audiometry-type.storage';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';

@Injectable()
export class CreatePatientAudiometryEntryUseCase {
  constructor(
    private readonly storage: PatientAudiometryEntryStorage,
    private readonly typeStorage: AudiometryTypeStorage,
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

    // El catálogo puede desactivar un tipo sin tocar el código: la validación vive en la base.
    if (!(await this.typeStorage.isActive(dto.typeCode))) {
      throw new BadRequestException(`Tipo de audiometría no válido: ${dto.typeCode}`);
    }

    const common = { tenantUuid, patientUuid, createdByUuid: actorUuid };
    const saved =
      dto.typeCode === 'SCREENING'
        ? await this.storage.create({
            ...common,
            typeCode: 'SCREENING',
            schemaVersion: dto.schemaVersion,
            payload: dto.payload,
          })
        : await this.storage.create({
            ...common,
            typeCode: 'CLINICAL',
            schemaVersion: dto.schemaVersion,
            payload: dto.payload,
          });

    const createdByName = await this.getOrCreateUser.execute(actorUuid, tenantUuid);
    return { ...saved, createdByName, invalidatedByName: null };
  }
}
