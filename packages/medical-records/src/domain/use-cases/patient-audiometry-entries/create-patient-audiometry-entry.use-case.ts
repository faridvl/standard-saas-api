import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PatientAudiometryEntryStorage } from '@medical-records/infrastructure/adapters/patientAudiometryEntryRepository/patient-audiometry-entry.storage';
import { CreatePatientAudiometryEntryDto } from '@medical-records/app/dtos/patient-audiometry-entry.dto';
import { PatientAudiometryEntryEntity } from '@medical-records/domain/entities/patient-audiometry-entry.entity';
import { AudiometryTypeStorage } from '@medical-records/infrastructure/adapters/audiometryTypeRepository/audiometry-type.storage';
import { EquipmentStorage } from '@medical-records/infrastructure/adapters/equipmentRepository/equipment.storage';
import { EQUIPMENT_REQUIRED_CODE } from '@medical-records/domain/utils/equipment.util';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';

@Injectable()
export class CreatePatientAudiometryEntryUseCase {
  constructor(
    private readonly storage: PatientAudiometryEntryStorage,
    private readonly typeStorage: AudiometryTypeStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
    private readonly equipmentStorage: EquipmentStorage,
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

    const equipment = await this.resolveEquipment(tenantUuid, dto.equipmentUuid);
    const common = { tenantUuid, patientUuid, createdByUuid: actorUuid, ...equipment };
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

  /**
   * El equipo es obligatorio solo si la clínica tiene alguno activo. Marca y modelo se copian a la
   * audiometría para que el historial no cambie si luego se edita el equipo.
   */
  private async resolveEquipment(
    tenantUuid: string,
    equipmentUuid: string | undefined,
  ): Promise<{
    equipmentUuid: string | null;
    equipmentBrand: string | null;
    equipmentModel: string | null;
  }> {
    const none = { equipmentUuid: null, equipmentBrand: null, equipmentModel: null };
    if (!equipmentUuid) {
      const all = await this.equipmentStorage.findAll(tenantUuid);
      if (all.some((item) => item.isActive)) {
        throw new BadRequestException({
          message: 'Indica el equipo con el que se hizo la audiometría',
          code: EQUIPMENT_REQUIRED_CODE,
        });
      }
      return none;
    }

    const equipment = await this.equipmentStorage.findByUuid(tenantUuid, equipmentUuid);
    if (!equipment) throw new NotFoundException('Equipo no encontrado');
    if (!equipment.isActive) throw new BadRequestException('El equipo está desactivado');
    return {
      equipmentUuid: equipment.uuid,
      equipmentBrand: equipment.brand,
      equipmentModel: equipment.model,
    };
  }
}
