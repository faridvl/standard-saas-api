import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma, PatientAudiometryEntry } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AudiometryPayloadV1,
  ScreeningPayloadV1,
  ScreeningResult,
} from '@medical-records/app/dtos/patient-audiometry-entry.dto';
import {
  CreatePatientAudiometryEntryData,
  PatientAudiometryEntryEntity,
  PatientAudiometryEntrySummary,
} from '@medical-records/domain/entities/patient-audiometry-entry.entity';
import { AudiometryEquipment } from '@medical-records/domain/entities/clinic-equipment.entity';
import { buildAudiometryNoteData } from '@medical-records/domain/utils/audiometry-note-text.util';

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

export type PatientAudiometryEntryRecord = DistributiveOmit<
  PatientAudiometryEntryEntity,
  'createdByName' | 'invalidatedByName'
>;
export type PatientAudiometryEntrySummaryRecord = Omit<
  PatientAudiometryEntrySummary,
  'createdByName' | 'invalidatedByName'
>;

/** Marca y modelo son la copia guardada al crear; sin equipo (audiometrías anteriores) es null. */
function toEquipment(
  uuid: string | null,
  brand: string | null,
  model: string | null,
): AudiometryEquipment | null {
  return uuid && brand && model ? { uuid, brand, model } : null;
}

type PatientAudiometryEntryWithType = PatientAudiometryEntry & { type: { name: string } };

const INCLUDE_TYPE_NAME = { type: { select: { name: true } } } as const;

interface AudiometryListRow {
  uuid: string;
  typeCode: string;
  typeName: string;
  screeningResult: ScreeningResult | null;
  createdAt: Date;
  createdByUuid: string;
  equipmentUuid: string | null;
  equipmentBrand: string | null;
  equipmentModel: string | null;
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

  private mapToRecord(record: PatientAudiometryEntryWithType): PatientAudiometryEntryRecord {
    const base = {
      uuid: record.uuid,
      patientUuid: record.patientUuid,
      schemaVersion: record.schemaVersion,
      typeName: record.type.name,
      createdAt: record.createdAt.toISOString(),
      createdByUuid: record.createdByUuid,
      equipment: toEquipment(record.equipmentUuid, record.equipmentBrand, record.equipmentModel),
      invalidatedAt: record.invalidatedAt?.toISOString() ?? null,
      invalidatedByUuid: record.invalidatedByUuid,
      invalidationReason: record.invalidationReason,
    };
    // Se valida con Zod al escribir; la columna solo guarda lo que pasó ese filtro.
    if (record.typeCode === 'SCREENING') {
      return {
        ...base,
        typeCode: 'SCREENING',
        payload: record.payload as unknown as ScreeningPayloadV1,
      };
    }
    return {
      ...base,
      typeCode: 'CLINICAL',
      payload: record.payload as unknown as AudiometryPayloadV1,
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
    // La nota de Control de evolución se crea con el registro en un solo lote, con la misma fecha y
    // enlazada por uuid. Marcar la audiometría como mal hecha no la toca.
    const uuid = randomUUID();
    const createdAt = new Date();
    const [record] = await this.prisma.$transaction([
      this.prisma.patientAudiometryEntry.create({
        data: {
          ...data,
          uuid,
          createdAt,
          payload: data.payload as unknown as Prisma.InputJsonObject,
        },
        include: INCLUDE_TYPE_NAME,
      }),
      this.prisma.patientNote.create({ data: buildAudiometryNoteData(data, createdAt, uuid) }),
    ]);
    return this.mapToRecord(record);
  }

  async findAllByPatient(
    patientUuid: string,
    tenantUuid: string,
  ): Promise<PatientAudiometryEntrySummaryRecord[]> {
    // Trae solo las rutas del resumen: los payloads completos pesan mucho y la lista no los usa.
    const rows = await this.prisma.$queryRaw<AudiometryListRow[]>`
      SELECT
        e."uuid",
        e."createdAt",
        e."createdByUuid",
        e."equipmentUuid",
        e."equipmentBrand",
        e."equipmentModel",
        e."invalidatedAt",
        e."invalidatedByUuid",
        e."invalidationReason",
        e."typeCode",
        t."name" AS "typeName",
        e."payload" #>> '{result}' AS "screeningResult",
        e."payload" #>> '{summary,ptaType}' AS "ptaType",
        e."payload" #>> '{summary,gradingScale}' AS "gradingScale",
        (e."payload" #>> '{summary,ears,RIGHT,pta}')::double precision AS "ptaRight",
        (e."payload" #>> '{summary,ears,LEFT,pta}')::double precision AS "ptaLeft"
      FROM "PatientAudiometryEntry" e
      JOIN "AudiometryType" t ON t."code" = e."typeCode"
      WHERE e."tenantUuid" = ${tenantUuid} AND e."patientUuid" = ${patientUuid}
      ORDER BY e."createdAt" DESC, e."id" DESC
    `;
    return rows.map((row) => ({
      uuid: row.uuid,
      typeCode: row.typeCode,
      typeName: row.typeName,
      screeningResult: row.screeningResult,
      createdAt: row.createdAt.toISOString(),
      createdByUuid: row.createdByUuid,
      equipment: toEquipment(row.equipmentUuid, row.equipmentBrand, row.equipmentModel),
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
      include: INCLUDE_TYPE_NAME,
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
