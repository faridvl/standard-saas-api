import { Injectable } from '@nestjs/common';
import { PatientDocument } from '@prisma/client';
import { PatientDocumentStorage } from '@medical-records/infrastructure/adapters/patientDocumentRepository/patient-document.storage';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

@Injectable()
export class DeletePatientDocumentUseCase {
  constructor(
    private readonly storage: PatientDocumentStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(uuid: string, tenantUuid: string, actorUuid?: string): Promise<PatientDocument> {
    const document = await this.storage.delete(uuid, tenantUuid);

    if (actorUuid) {
      // El nombre queda en la bitácora aunque el archivo ya no exista.
      await this.recordActivity.execute({
        tenantUuid,
        patientUuid: document.patientUuid,
        actorUuid,
        action: PatientActivityAction.DOCUMENT_DELETED,
        detail: {
          documentUuid: document.uuid,
          originalName: document.originalName,
          category: document.category,
        },
      });
    }

    return document;
  }
}
