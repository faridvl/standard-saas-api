import { Injectable } from '@nestjs/common';
import { PatientQuestionnaireEntry, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PatientBackgroundAnswer } from '@medical-records/domain/entities/patient-background.entity';
import {
  CreatePatientQuestionnaireEntryData,
  PatientQuestionnaireEntryEntity,
  QuestionnaireTemplateSnapshot,
  UpdatePatientQuestionnaireEntryData,
} from '@medical-records/domain/entities/patient-questionnaire-entry.entity';

export type PatientQuestionnaireEntryRecord = Omit<
  PatientQuestionnaireEntryEntity,
  'createdByName' | 'updatedByName' | 'canEdit'
>;

@Injectable()
export class PatientQuestionnaireEntryStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToRecord(record: PatientQuestionnaireEntry): PatientQuestionnaireEntryRecord {
    return {
      uuid: record.uuid,
      patientUuid: record.patientUuid,
      templateUuid: record.templateUuid,
      templateSnapshot: record.templateSnapshot as unknown as QuestionnaireTemplateSnapshot,
      answers: record.answers as unknown as Record<string, PatientBackgroundAnswer>,
      createdAt: record.createdAt.toISOString(),
      createdByUuid: record.createdByUuid,
      updatedAt: record.updatedAt?.toISOString() ?? null,
      updatedByUuid: record.updatedByUuid,
    };
  }

  // La tabla no guarda tenantUuid: la pertenencia a la clínica se comprueba
  // siempre sobre el paciente. Un paciente con borrado lógico no recibe registros nuevos.
  async patientExists(
    patientUuid: string,
    tenantUuid: string,
    options: { includeDeleted: boolean },
  ): Promise<boolean> {
    const patient = await this.prisma.patient.findFirst({
      where: {
        uuid: patientUuid,
        tenantUuid,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
      select: { id: true },
    });
    return patient !== null;
  }

  async findAllByPatient(
    patientUuid: string,
    templateUuid?: string,
  ): Promise<PatientQuestionnaireEntryRecord[]> {
    const records = await this.prisma.patientQuestionnaireEntry.findMany({
      where: { patientUuid, ...(templateUuid ? { templateUuid } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return records.map((record) => this.mapToRecord(record));
  }

  async create(
    data: CreatePatientQuestionnaireEntryData,
  ): Promise<PatientQuestionnaireEntryRecord> {
    const record = await this.prisma.patientQuestionnaireEntry.create({
      data: {
        patientUuid: data.patientUuid,
        templateUuid: data.templateUuid,
        templateSnapshot: data.templateSnapshot as unknown as Prisma.InputJsonValue,
        answers: data.answers as unknown as Prisma.InputJsonValue,
        createdByUuid: data.createdByUuid,
      },
    });
    return this.mapToRecord(record);
  }

  // Se busca siempre por paciente: la pertenencia a la clínica se comprueba sobre el paciente.
  async findByUuid(
    entryUuid: string,
    patientUuid: string,
  ): Promise<PatientQuestionnaireEntryRecord | null> {
    const record = await this.prisma.patientQuestionnaireEntry.findFirst({
      where: { uuid: entryUuid, patientUuid },
    });
    return record ? this.mapToRecord(record) : null;
  }

  async update(
    entryUuid: string,
    data: UpdatePatientQuestionnaireEntryData,
  ): Promise<PatientQuestionnaireEntryRecord> {
    const record = await this.prisma.patientQuestionnaireEntry.update({
      where: { uuid: entryUuid },
      data: {
        answers: data.answers as unknown as Prisma.InputJsonValue,
        updatedAt: data.updatedAt,
        updatedByUuid: data.updatedByUuid,
      },
    });
    return this.mapToRecord(record);
  }

  async countByTemplate(templateUuid: string): Promise<number> {
    return await this.prisma.patientQuestionnaireEntry.count({ where: { templateUuid } });
  }
}
