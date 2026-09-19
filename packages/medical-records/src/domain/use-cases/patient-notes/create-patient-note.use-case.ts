import { Injectable } from '@nestjs/common';
import { PatientNoteStorage, CreatePatientNoteData } from '@medical-records/infrastructure/adapters/patientNoteRepository/patient-note.storage';

@Injectable()
export class CreatePatientNoteUseCase {
  constructor(private readonly storage: PatientNoteStorage) {}

  async execute(data: CreatePatientNoteData) {
    return await this.storage.create(data);
  }
}
