import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePatientDocumentData {
  patientUuid: string;
  tenantUuid: string;
  originalName: string;
  url: string;
  category: string;
  size: number;
}

@Injectable()
export class PatientDocumentStorage {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePatientDocumentData) {
    return await this.prisma.patientDocument.create({ data });
  }

  async findAllByPatient(patientUuid: string, tenantUuid: string) {
    return await this.prisma.patientDocument.findMany({
      where: { patientUuid, tenantUuid },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async delete(uuid: string, tenantUuid: string) {
    return await this.prisma.patientDocument.delete({
      where: { uuid, tenantUuid },
    });
  }
}
