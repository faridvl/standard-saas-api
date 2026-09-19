import { Injectable } from '@nestjs/common';
import { PatientDocument } from '@prisma/client';
import { PatientDocumentStorage } from '@medical-records/infrastructure/adapters/patientDocumentRepository/patient-document.storage';
import { GetOrCreateUserUseCase } from '@medical-records/domain/use-cases/users/get-or-create-user.use-case';

export type PatientDocumentWithUploader = PatientDocument & { uploadedByName: string | null };

@Injectable()
export class FindPatientDocumentsUseCase {
  constructor(
    private readonly storage: PatientDocumentStorage,
    private readonly getOrCreateUser: GetOrCreateUserUseCase,
  ) {}

  async execute(patientUuid: string, tenantUuid: string): Promise<PatientDocumentWithUploader[]> {
    const documents = await this.storage.findAllByPatient(patientUuid, tenantUuid);

    return await Promise.all(
      documents.map(async (document) => ({
        ...document,
        uploadedByName: await this.getOrCreateUser.execute(document.uploadedByUuid, tenantUuid),
      })),
    );
  }
}
