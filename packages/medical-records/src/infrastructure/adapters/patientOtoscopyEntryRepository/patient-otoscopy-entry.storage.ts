import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientOtoscopyEntry } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePatientOtoscopyEntryData,
  PatientOtoscopyEntryEntity,
  UpdatePatientOtoscopyEntryData,
} from '@medical-records/domain/entities/patient-otoscopy-entry.entity';
import { buildOtoscopyNoteData } from '@medical-records/domain/utils/otoscopy-note-text.util';
import { PatientFieldChange } from '@medical-records/domain/types/patient-activity.types';

export type PatientOtoscopyEntryRecord = Omit<
  PatientOtoscopyEntryEntity,
  'createdByName' | 'updatedByName' | 'canEdit'
>;

export interface PatientOtoscopyEntryUpdatePlan {
  data: UpdatePatientOtoscopyEntryData;
  /** Vacío: no se guarda revisión ni se marca como corregido. */
  changes: PatientFieldChange[];
}

export interface PatientOtoscopyEntryUpdateResult {
  entry: PatientOtoscopyEntryRecord;
  changes: PatientFieldChange[];
}

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

  // La nota de Control de evolución se crea con el registro en un solo lote: si una falla, ninguna
  // queda. Misma fecha en ambas, para que la migración de respaldo la reconozca. Las correcciones
  // posteriores no la tocan (ver update).
  async create(data: CreatePatientOtoscopyEntryData): Promise<PatientOtoscopyEntryRecord> {
    const createdAt = new Date();
    const [record] = await this.prisma.$transaction([
      this.prisma.patientOtoscopyEntry.create({ data: { ...data, createdAt } }),
      this.prisma.patientNote.create({ data: buildOtoscopyNoteData(data, createdAt) }),
    ]);
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

  // Bloquea la fila, deja que quien llama decida con el texto vigente y, si hay
  // cambios, guarda la revisión y el texto nuevo en la misma transacción. Dos
  // correcciones simultáneas se turnan y cada revisión guarda lo que de verdad había.
  async update(
    entryUuid: string,
    patientUuid: string,
    tenantUuid: string,
    plan: (current: PatientOtoscopyEntryRecord) => PatientOtoscopyEntryUpdatePlan,
  ): Promise<PatientOtoscopyEntryUpdateResult> {
    return this.prisma.$transaction(async (transaction) => {
      const locked = await transaction.$queryRaw<{ id: number }[]>`
        SELECT "id" FROM "PatientOtoscopyEntry"
        WHERE "uuid" = ${entryUuid} AND "tenantUuid" = ${tenantUuid} AND "patientUuid" = ${patientUuid}
        FOR UPDATE`;
      if (locked.length === 0) {
        throw new NotFoundException('Registro no encontrado');
      }
      const current = await transaction.patientOtoscopyEntry.findFirstOrThrow({
        where: { uuid: entryUuid, tenantUuid, patientUuid },
      });
      const before = this.mapToRecord(current);
      const { data, changes } = plan(before);
      if (changes.length === 0) {
        return { entry: before, changes };
      }
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
      const updated = await transaction.patientOtoscopyEntry.update({
        where: { uuid: entryUuid, tenantUuid },
        data: {
          otoscopyRight: data.otoscopyRight,
          otoscopyLeft: data.otoscopyLeft,
          updatedAt: data.updatedAt,
          updatedByUuid: data.updatedByUuid,
        },
      });
      return { entry: this.mapToRecord(updated), changes };
    });
  }
}
