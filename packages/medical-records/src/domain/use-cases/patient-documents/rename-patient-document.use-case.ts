import { Injectable } from '@nestjs/common';
import { PatientDocument } from '@prisma/client';
import { PatientDocumentStorage } from '@medical-records/infrastructure/adapters/patientDocumentRepository/patient-document.storage';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

@Injectable()
export class RenamePatientDocumentUseCase {
  constructor(
    private readonly storage: PatientDocumentStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    uuid: string,
    tenantUuid: string,
    originalName: string,
    actorUuid?: string,
  ): Promise<PatientDocument> {
    const previous = await this.storage.findByUuid(uuid, tenantUuid);
    const document = await this.storage.rename(uuid, tenantUuid, originalName);

    if (actorUuid && previous && previous.originalName !== document.originalName) {
      await this.recordActivity.execute({
        tenantUuid,
        patientUuid: document.patientUuid,
        actorUuid,
        action: PatientActivityAction.DOCUMENT_RENAMED,
        detail: {
          documentUuid: document.uuid,
          before: previous.originalName,
          after: document.originalName,
        },
      });
    }

    return document;
  }
}
