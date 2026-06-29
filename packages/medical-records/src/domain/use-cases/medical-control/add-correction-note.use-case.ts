import { Injectable } from '@nestjs/common';
import { MedicalControlStorage } from '@medical-records/infrastructure/adapters/controlRepository/medical-control.storage';

@Injectable()
export class AddCorrectionNoteUseCase {
  constructor(private readonly storage: MedicalControlStorage) {}

  async execute(uuid: string, tenantUuid: string, correctionNotes: string) {
    return await this.storage.addCorrectionNote(uuid, tenantUuid, correctionNotes);
  }
}
