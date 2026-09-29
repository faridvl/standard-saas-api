import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentCategory } from '@prisma/client';
import {
  PatientDocumentStorage,
  CreatePatientDocumentData,
} from '@medical-records/infrastructure/adapters/patientDocumentRepository/patient-document.storage';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';
import { PatientDocumentWithUploader } from '@medical-records/domain/use-cases/patient-documents/find-patient-documents.use-case';
import { RecordPatientActivityUseCase } from '@medical-records/domain/use-cases/patient-activity/record-patient-activity.use-case';
import { PatientActivityAction } from '@medical-records/domain/types/patient-activity.types';

export interface CreatePatientDocumentInput extends Omit<CreatePatientDocumentData, 'category'> {
  category: string;
}

@Injectable()
export class CreatePatientDocumentUseCase {
  constructor(
    private readonly storage: PatientDocumentStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
    private readonly recordActivity: RecordPatientActivityUseCase,
  ) {}

  async execute(data: CreatePatientDocumentInput): Promise<PatientDocumentWithUploader> {
    if (!Object.values(DocumentCategory).includes(data.category as DocumentCategory)) {
      throw new BadRequestException(`category inválida: ${data.category}`);
    }
    const document = await this.storage.create({
      ...data,
      category: data.category as DocumentCategory,
    });

    await this.recordActivity.execute({
      tenantUuid: data.tenantUuid,
      patientUuid: data.patientUuid,
      actorUuid: data.uploadedByUuid,
      action: PatientActivityAction.DOCUMENT_UPLOADED,
      detail: {
        documentUuid: document.uuid,
        originalName: document.originalName,
        category: document.category,
      },
    });

    const uploadedByName = await this.getOrCreateUser.execute(
      document.uploadedByUuid,
      data.tenantUuid,
    );
    return { ...document, uploadedByName };
  }
}
