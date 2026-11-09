import { Injectable } from '@nestjs/common';
import { PatientNote } from '@prisma/client';
import { PatientNoteStorage } from '@medical-records/infrastructure/adapters/patientNoteRepository/patient-note.storage';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';

export type PatientNoteWithAuthor = PatientNote & { authorName: string | null };

@Injectable()
export class FindPatientNotesUseCase {
  constructor(
    private readonly storage: PatientNoteStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
  ) {}

  async execute(patientUuid: string, tenantUuid: string): Promise<PatientNoteWithAuthor[]> {
    const notes = await this.storage.findAllByPatient(patientUuid, tenantUuid);

    return await Promise.all(
      notes.map(async (note) => ({
        ...note,
        authorName: await this.resolveAuthorName(note.authorUuid, tenantUuid),
      })),
    );
  }

  // El nombre es informativo: si un autor no se puede resolver, la lista no se cae.
  private async resolveAuthorName(authorUuid: string, tenantUuid: string): Promise<string | null> {
    try {
      return await this.getOrCreateUser.execute(authorUuid, tenantUuid);
    } catch {
      return null;
    }
  }
}
