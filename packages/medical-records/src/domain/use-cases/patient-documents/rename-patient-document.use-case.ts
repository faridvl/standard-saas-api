import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientDocument } from '@prisma/client';
import { PatientDocumentStorage } from '@medical-records/infrastructure/adapters/patientDocumentRepository/patient-document.storage';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';
import { UpdatePatientDocumentDto } from '@medical-records/app/dtos/patient-document.dto';

/** Cambia el nombre y/o la sección (categoría) de un documento. */
@Injectable()
export class RenamePatientDocumentUseCase {
  constructor(
    private readonly storage: PatientDocumentStorage,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(
    uuid: string,
    tenantUuid: string,
    dto: UpdatePatientDocumentDto,
    actorUuid?: string,
  ): Promise<PatientDocument> {
    const previous = await this.storage.findByUuid(uuid, tenantUuid);
    if (!previous) {
      throw new NotFoundException(`Documento con UUID ${uuid} no encontrado`);
    }

    const document = await this.storage.update(uuid, tenantUuid, {
      originalName: dto.originalName,
      category: dto.category,
    });

    if (!actorUuid) return document;

    if (previous.originalName !== document.originalName) {
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

    if (previous.category !== document.category) {
      await this.recordActivity.execute({
        tenantUuid,
        patientUuid: document.patientUuid,
        actorUuid,
        action: PatientActivityAction.DOCUMENT_CATEGORY_CHANGED,
        detail: {
          documentUuid: document.uuid,
          before: previous.category,
          after: document.category,
        },
      });
    }

    return document;
  }
}
