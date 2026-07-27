import { Injectable } from '@nestjs/common';
import { EncounterStorage } from '@medical-records/infrastructure/adapters/encounterRepository/encounter.storage';
import { EncounterEntity } from '@medical-records/domain/entities/encounter.entity';

@Injectable()
export class CloseEncounterUseCase {
  constructor(private readonly storage: EncounterStorage) {}

  async execute(uuid: string, tenantUuid: string): Promise<EncounterEntity> {
    return this.storage.close(uuid, tenantUuid);
  }
}
