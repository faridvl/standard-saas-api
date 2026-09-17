import { Injectable } from '@nestjs/common';
import { DocumentCategory } from '@prisma/client';
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

  async create(data: CreatePatientNoteData) {
    return await this.prisma.patientNote.create({ data });
  }

  async findAllByPatient(patientUuid: string, tenantUuid: string) {
    return await this.prisma.patientNote.findMany({
      where: { patientUuid, tenantUuid },
      orderBy: { createdAt: 'desc' },
    });
  }
}
