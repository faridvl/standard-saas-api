import { Injectable } from '@nestjs/common';
import { PatientNoteStorage } from '@medical-records/infrastructure/adapters/patientNoteRepository/patient-note.storage';

@Injectable()
export class FindPatientNotesUseCase {
  constructor(private readonly storage: PatientNoteStorage) {}

  async execute(patientUuid: string, tenantUuid: string) {
    return await this.storage.findAllByPatient(patientUuid, tenantUuid);
  }
}
