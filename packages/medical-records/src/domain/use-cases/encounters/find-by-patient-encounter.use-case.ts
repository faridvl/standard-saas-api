import { Injectable } from '@nestjs/common';
import { EncounterStorage } from '@medical-records/infrastructure/adapters/encounterRepository/encounter.storage';
import { EncounterEntity } from '@medical-records/domain/entities/encounter.entity';

@Injectable()
export class FindByPatientEncounterUseCase {
  constructor(private readonly storage: EncounterStorage) {}

  // El expediente es del paciente, no del médico (NOM-004 5.14): la lista de
  // encuentros para el timeline no se filtra por especialidad de quien lee.
  async execute(patientUuid: string, tenantUuid: string): Promise<EncounterEntity[]> {
    return this.storage.findAllByPatient(patientUuid, tenantUuid);
  }
}
