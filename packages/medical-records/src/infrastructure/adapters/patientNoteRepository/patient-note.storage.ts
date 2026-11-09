import { Injectable } from '@nestjs/common';
import { DocumentCategory, PatientNote } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePatientNoteData {
  patientUuid: string;
  tenantUuid: string;
  authorUuid: string;
  category: DocumentCategory;
  text: string;
}

@Injectable()
export class PatientNoteStorage {
  constructor(private readonly prisma: PrismaService) {}

  async patientExists(patientUuid: string, tenantUuid: string): Promise<boolean> {
    const patient = await this.prisma.patient.findFirst({
      where: { uuid: patientUuid, tenantUuid, deletedAt: null },
      select: { id: true },
    });
    return patient !== null;
  }

  async create(data: CreatePatientNoteData): Promise<PatientNote> {
    return await this.prisma.patientNote.create({ data });
  }

  async findAllByPatient(patientUuid: string, tenantUuid: string): Promise<PatientNote[]> {
    return await this.prisma.patientNote.findMany({
      where: { patientUuid, tenantUuid },
      orderBy: { createdAt: 'desc' },
    });
  }
}
