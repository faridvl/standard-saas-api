import { MedicalControlStorage } from '@medical-records/infrastructure/adapters/controlRepository/medical-control.storage';
import { MedicalControlEntity } from '@medical-records/domain/entities/medical-control.entity';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class FindOneMedicalControlUseCase {
  constructor(
    private readonly controlStorage: MedicalControlStorage,
    // private readonly followUpStorage: FollowUpStorage, // Orquestamos ambos storages
  ) {}

  async execute(
    controlUuid: string,
    context: { tenantUuid: string; userUuid: string },
  ): Promise<MedicalControlEntity> {
    const control = await this.controlStorage.findOneByUuid(controlUuid, context.tenantUuid);

    if (!control) {
      throw new NotFoundException(`Control médico con UUID ${controlUuid} no encontrado`);
    }

    const followUp = null; //await this.followUpStorage.findByControlUuid(controlUuid, context.tenantUuid);

    return {
      ...control,
      followUp: followUp || { hasFollowUp: false },
    };
  }
}
