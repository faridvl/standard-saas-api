import { Injectable } from '@nestjs/common';
import { Prisma, PatientAudiometryEntry } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AudiometryPayloadV1 } from '@medical-records/app/dtos/patient-audiometry-entry.dto';
import {
  CreatePatientAudiometryEntryData,
  PatientAudiometryEntryEntity,
  PatientAudiometryEntrySummary,
} from '@medical-records/domain/entities/patient-audiometry-entry.entity';

export type PatientAudiometryEntryRecord = Omit<
  PatientAudiometryEntryEntity,
  'createdByName' | 'invalidatedByName'
>;
export type PatientAudiometryEntrySummaryRecord = Omit<
  PatientAudiometryEntrySummary,
  'createdByName' | 'invalidatedByName'
>;

interface AudiometryListRow {
  uuid: string;
  createdAt: Date;
  createdByUuid: string;
  invalidatedAt: Date | null;
  invalidatedByUuid: string | null;
  invalidationReason: string | null;
  ptaType: PatientAudiometryEntrySummary['ptaType'];
  gradingScale: PatientAudiometryEntrySummary['gradingScale'];
  ptaRight: number | null;
  ptaLeft: number | null;
}

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
      invalidatedAt: record.invalidatedAt?.toISOString() ?? null,
      invalidatedByUuid: record.invalidatedByUuid,
      invalidationReason: record.invalidationReason,
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
    // Trae solo las rutas del resumen: los payloads completos pesan mucho y la lista no los usa.
    const rows = await this.prisma.$queryRaw<AudiometryListRow[]>`
      SELECT
        "uuid",
        "createdAt",
        "createdByUuid",
        "invalidatedAt",
        "invalidatedByUuid",
        "invalidationReason",
        "payload" #>> '{summary,ptaType}' AS "ptaType",
        "payload" #>> '{summary,gradingScale}' AS "gradingScale",
        ("payload" #>> '{summary,ears,RIGHT,pta}')::double precision AS "ptaRight",
        ("payload" #>> '{summary,ears,LEFT,pta}')::double precision AS "ptaLeft"
      FROM "PatientAudiometryEntry"
      WHERE "tenantUuid" = ${tenantUuid} AND "patientUuid" = ${patientUuid}
      ORDER BY "createdAt" DESC, "id" DESC
    `;
    return rows.map((row) => ({
      uuid: row.uuid,
      createdAt: row.createdAt.toISOString(),
      createdByUuid: row.createdByUuid,
      invalidatedAt: row.invalidatedAt?.toISOString() ?? null,
      invalidatedByUuid: row.invalidatedByUuid,
      invalidationReason: row.invalidationReason,
      ptaType: row.ptaType,
      gradingScale: row.gradingScale,
      ptaRight: row.ptaRight,
      ptaLeft: row.ptaLeft,
    }));
  }

  // Filtra por paciente y negocio: un uuid de otro paciente o clínica, o de un paciente borrado,
  // no existe para quien consulta.
  async findByUuid(
    entryUuid: string,
    patientUuid: string,
    tenantUuid: string,
  ): Promise<PatientAudiometryEntryRecord | null> {
    const record = await this.prisma.patientAudiometryEntry.findFirst({
      where: { uuid: entryUuid, patientUuid, tenantUuid, patient: { deletedAt: null } },
    });
    return record ? this.mapToRecord(record) : null;
  }

  /**
   * Marca la entrada una sola vez. El filtro incluye negocio y paciente, y `invalidatedAt: null`
   * hace atómica la regla de "ya marcada": devuelve false si no hubo fila que actualizar.
   */
  async invalidate(
    entryUuid: string,
    patientUuid: string,
    tenantUuid: string,
    invalidatedByUuid: string,
    invalidationReason: string,
  ): Promise<boolean> {
    const result = await this.prisma.patientAudiometryEntry.updateMany({
      where: {
        uuid: entryUuid,
        patientUuid,
        tenantUuid,
        invalidatedAt: null,
        patient: { deletedAt: null },
      },
      data: { invalidatedAt: new Date(), invalidatedByUuid, invalidationReason },
    });
    return result.count > 0;
  }
}
