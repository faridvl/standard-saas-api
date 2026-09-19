import { Injectable } from '@nestjs/common';
import {
  PatientNoteStorage,
  CreatePatientNoteData,
} from '@medical-records/infrastructure/adapters/patientNoteRepository/patient-note.storage';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';
import { PatientNoteWithAuthor } from '@medical-records/domain/use-cases/patient-notes/find-patient-notes.use-case';

@Injectable()
export class CreatePatientNoteUseCase {
  constructor(
    private readonly storage: PatientNoteStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
  ) {}

  async execute(data: CreatePatientNoteData): Promise<PatientNoteWithAuthor> {
    const note = await this.storage.create(data);
    const authorName = await this.getOrCreateUser.execute(note.authorUuid, data.tenantUuid);
    return { ...note, authorName };
  }
}
