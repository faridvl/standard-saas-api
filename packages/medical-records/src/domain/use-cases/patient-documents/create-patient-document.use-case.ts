import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentCategory } from '@prisma/client';
import { PatientDocumentStorage, CreatePatientDocumentData } from '@medical-records/infrastructure/adapters/patientDocumentRepository/patient-document.storage';

export interface CreatePatientDocumentInput extends Omit<CreatePatientDocumentData, 'category'> {
  category: string;
}

@Injectable()
export class CreatePatientDocumentUseCase {
  constructor(private readonly storage: PatientDocumentStorage) {}

  async execute(data: CreatePatientDocumentInput) {
    if (!Object.values(DocumentCategory).includes(data.category as DocumentCategory)) {
      throw new BadRequestException(`category inválida: ${data.category}`);
    }
    return await this.storage.create({ ...data, category: data.category as DocumentCategory });
  }
}
