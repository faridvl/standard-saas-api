import { Injectable } from '@nestjs/common';
import {
  PatientNoteStorage,
  CreatePatientNoteData,
} from '@medical-records/infrastructure/adapters/patientNoteRepository/patient-note.storage';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';
import { PatientNoteWithAuthor } from '@medical-records/domain/use-cases/patient-notes/find-patient-notes.use-case';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

/** Largo del extracto de la nota que se guarda en la bitácora. */
const NOTE_EXCERPT_LENGTH = 120;

@Injectable()
export class CreatePatientNoteUseCase {
  constructor(
    private readonly storage: PatientNoteStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(data: CreatePatientNoteData): Promise<PatientNoteWithAuthor> {
    const note = await this.storage.create(data);

    await this.recordActivity.execute({
      tenantUuid: data.tenantUuid,
      patientUuid: data.patientUuid,
      actorUuid: data.authorUuid,
      action: PatientActivityAction.NOTE_ADDED,
      detail: { category: note.category, excerpt: note.text.slice(0, NOTE_EXCERPT_LENGTH) },
    });

    const authorName = await this.getOrCreateUser.execute(note.authorUuid, data.tenantUuid);
    return { ...note, authorName };
  }
}
