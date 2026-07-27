import { Injectable, NotFoundException } from '@nestjs/common';
import { EncounterStorage } from '@medical-records/infrastructure/adapters/encounterRepository/encounter.storage';
import { EncounterDetail } from '@medical-records/domain/entities/encounter.entity';

@Injectable()
export class FindOneEncounterUseCase {
  constructor(private readonly storage: EncounterStorage) {}

  async execute(uuid: string, tenantUuid: string): Promise<EncounterDetail> {
    const encounter = await this.storage.findOneByUuid(uuid, tenantUuid);

    if (!encounter) {
      throw new NotFoundException(`Encuentro con UUID ${uuid} no encontrado`);
    }

    return encounter;
  }
}
