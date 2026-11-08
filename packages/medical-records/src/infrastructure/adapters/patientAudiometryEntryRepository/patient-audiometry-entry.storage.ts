import { Injectable } from '@nestjs/common';
import { Prisma, PatientAudiometryEntry } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AudiometryPayloadV1 } from '@medical-records/app/dtos/patient-audiometry-entry.dto';
import {
  CreatePatientAudiometryEntryData,
  PatientAudiometryEntryEntity,
  PatientAudiometryEntrySummary,
} from '@medical-records/domain/entities/patient-audiometry-entry.entity';

export type PatientAudiometryEntryRecord = Omit<PatientAudiometryEntryEntity, 'createdByName'>;
export type PatientAudiometryEntrySummaryRecord = Omit<
  PatientAudiometryEntrySummary,
  'createdByName'
>;

@Injectable()
export class PatientAudiometryEntryStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToRecord(record: PatientAudiometryEntry): PatientAudiometryEntryRecord {
    return {
      uuid: record.uuid,
      patientUuid: record.patientUuid,
      schemaVersion: record.schemaVersion,
      // Se valida con Zod al escribir; la columna solo guarda lo que pasó ese filtro.
      payload: record.payload as unknown as AudiometryPayloadV1,
      createdAt: record.createdAt.toISOString(),
      createdByUuid: record.createdByUuid,
    };
  }

  // Un paciente con borrado lógico no recibe registros nuevos.
  async patientExists(patientUuid: string, tenantUuid: string): Promise<boolean> {
    const patient = await this.prisma.patient.findFirst({
      where: { uuid: patientUuid, tenantUuid, deletedAt: null },
      select: { id: true },
    });
    return patient !== null;
  }

  async create(data: CreatePatientAudiometryEntryData): Promise<PatientAudiometryEntryRecord> {
    const record = await this.prisma.patientAudiometryEntry.create({
      data: { ...data, payload: data.payload as unknown as Prisma.InputJsonObject },
    });
    return this.mapToRecord(record);
  }

  async findAllByPatient(
    patientUuid: string,
    tenantUuid: string,
  ): Promise<PatientAudiometryEntrySummaryRecord[]> {
    const records = await this.prisma.patientAudiometryEntry.findMany({
      where: { tenantUuid, patientUuid },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        uuid: true,
        createdAt: true,
        createdByUuid: true,
        payload: true,
      },
    });
    return records.map((record) => {
      const payload = record.payload as unknown as AudiometryPayloadV1;
      return {
        uuid: record.uuid,
        createdAt: record.createdAt.toISOString(),
        createdByUuid: record.createdByUuid,
        ptaRight: payload.summary?.ears?.RIGHT?.pta ?? null,
        ptaLeft: payload.summary?.ears?.LEFT?.pta ?? null,
      };
    });
  }

  // Filtra por paciente y negocio: un uuid de otro paciente o clínica no existe para quien consulta.
  async findByUuid(
    entryUuid: string,
    patientUuid: string,
    tenantUuid: string,
  ): Promise<PatientAudiometryEntryRecord | null> {
    const record = await this.prisma.patientAudiometryEntry.findFirst({
      where: { uuid: entryUuid, patientUuid, tenantUuid },
    });
    return record ? this.mapToRecord(record) : null;
  }
}
