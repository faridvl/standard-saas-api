import { Injectable } from '@nestjs/common';
import { DocumentCategory, PatientDocument } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePatientDocumentData {
  patientUuid: string;
  tenantUuid: string;
  originalName: string;
  url: string;
  category: DocumentCategory;
  size: number;
  uploadedByUuid: string;
}

@Injectable()
export class PatientDocumentStorage {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePatientDocumentData): Promise<PatientDocument> {
    return await this.prisma.patientDocument.create({ data });
  }

  async findAllByPatient(patientUuid: string, tenantUuid: string): Promise<PatientDocument[]> {
    return await this.prisma.patientDocument.findMany({
      where: { patientUuid, tenantUuid },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async findByUuid(uuid: string, tenantUuid: string): Promise<PatientDocument | null> {
    return await this.prisma.patientDocument.findFirst({ where: { uuid, tenantUuid } });
  }

  async update(
    uuid: string,
    tenantUuid: string,
    data: { originalName?: string; category?: DocumentCategory },
  ): Promise<PatientDocument> {
    return await this.prisma.patientDocument.update({
      where: { uuid, tenantUuid },
      data,
    });
  }

  /** Si el documento era la garantía elegida de un paciente, el paciente queda sin ella. */
  async delete(uuid: string, tenantUuid: string): Promise<PatientDocument> {
    const [document] = await this.prisma.$transaction([
      this.prisma.patientDocument.delete({ where: { uuid, tenantUuid } }),
      this.prisma.patient.updateMany({
        where: { tenantUuid, warrantyDocumentUuid: uuid },
        data: { warrantyDocumentUuid: null },
      }),
    ]);
    return document;
  }
}
