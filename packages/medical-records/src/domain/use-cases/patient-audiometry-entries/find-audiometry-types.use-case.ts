import { Injectable } from '@nestjs/common';
import { AudiometryTypeStorage } from '@medical-records/infrastructure/adapters/audiometryTypeRepository/audiometry-type.storage';
import { AudiometryTypeItem } from '@medical-records/domain/entities/patient-audiometry-entry.entity';

@Injectable()
export class FindAudiometryTypesUseCase {
  constructor(private readonly typeStorage: AudiometryTypeStorage) {}

  async execute(): Promise<AudiometryTypeItem[]> {
    return await this.typeStorage.findActive();
  }
}
