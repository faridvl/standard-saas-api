import { Injectable } from '@nestjs/common';
import { PatientOtoscopyEntry } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePatientOtoscopyEntryData,
  PatientOtoscopyEntryEntity,
  UpdatePatientOtoscopyEntryData,
} from '@medical-records/domain/entities/patient-otoscopy-entry.entity';

export type PatientOtoscopyEntryRecord = Omit<
  PatientOtoscopyEntryEntity,
  'createdByName' | 'updatedByName' | 'canEdit'
>;

@Injectable()
export class PatientOtoscopyEntryStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToRecord(record: PatientOtoscopyEntry): PatientOtoscopyEntryRecord {
    return {
      uuid: record.uuid,
      patientUuid: record.patientUuid,
      otoscopyRight: record.otoscopyRight,
      otoscopyLeft: record.otoscopyLeft,
      createdAt: record.createdAt.toISOString(),
      createdByUuid: record.createdByUuid,
      updatedAt: record.updatedAt?.toISOString() ?? null,
      updatedByUuid: record.updatedByUuid,
    };
  }

  // Un paciente con borrado lógico no recibe registros nuevos ni correcciones.
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
    tenantUuid: string,
  ): Promise<PatientOtoscopyEntryRecord[]> {
    const records = await this.prisma.patientOtoscopyEntry.findMany({
      where: { tenantUuid, patientUuid },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return records.map((record) => this.mapToRecord(record));
  }

  async create(data: CreatePatientOtoscopyEntryData): Promise<PatientOtoscopyEntryRecord> {
    const record = await this.prisma.patientOtoscopyEntry.create({ data });
    return this.mapToRecord(record);
  }

  async findByUuid(
    entryUuid: string,
    patientUuid: string,
    tenantUuid: string,
  ): Promise<PatientOtoscopyEntryRecord | null> {
    const record = await this.prisma.patientOtoscopyEntry.findFirst({
      where: { uuid: entryUuid, patientUuid, tenantUuid },
    });
    return record ? this.mapToRecord(record) : null;
  }

  // Guarda el texto que había y lo reemplaza en una sola transacción: si el
  // update falla no queda una revisión suelta, y si la revisión falla no se pierde nada.
  async update(
    entryUuid: string,
    tenantUuid: string,
    data: UpdatePatientOtoscopyEntryData,
  ): Promise<PatientOtoscopyEntryRecord> {
    const record = await this.prisma.$transaction(async (transaction) => {
      const current = await transaction.patientOtoscopyEntry.findFirstOrThrow({
        where: { uuid: entryUuid, tenantUuid },
        select: { otoscopyRight: true, otoscopyLeft: true },
      });
      await transaction.patientOtoscopyEntryRevision.create({
        data: {
          entryUuid,
          tenantUuid,
          otoscopyRight: current.otoscopyRight,
          otoscopyLeft: current.otoscopyLeft,
          revisedAt: data.updatedAt,
          revisedByUuid: data.updatedByUuid,
        },
      });
      return transaction.patientOtoscopyEntry.update({
        where: { uuid: entryUuid },
        data: {
          otoscopyRight: data.otoscopyRight,
          otoscopyLeft: data.otoscopyLeft,
          updatedAt: data.updatedAt,
          updatedByUuid: data.updatedByUuid,
        },
      });
    });
    return this.mapToRecord(record);
  }
}
