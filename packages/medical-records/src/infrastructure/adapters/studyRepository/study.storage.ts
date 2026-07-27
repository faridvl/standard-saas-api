import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Study as PrismaStudy, Prisma } from '@prisma/client';
import { StudyEntity } from '@medical-records/domain/entities/study.entity';
import { StudyType } from '@medical-records/domain/types/study.types';

@Injectable()
export class StudyStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(record: PrismaStudy): StudyEntity {
    return {
      uuid: record.uuid,
      encounterUuid: record.encounterUuid,
      patientUuid: record.patientUuid,
      tenantUuid: record.tenantUuid,
      autorUuid: record.autorUuid,
      tipo: record.tipo as StudyType,
      payload: record.payload as Record<string, unknown>,
      documentUuid: record.documentUuid,
      createdAt: record.createdAt.toISOString(),
    };
  }

  // Study es inmutable (append-only, NOM-004 5.11): no existe método de
  // actualización. Repetir una medición crea un registro nuevo.
  async save(data: {
    encounterUuid: string;
    patientUuid: string;
    tenantUuid: string;
    autorUuid: string;
    tipo: StudyType;
    payload: Record<string, unknown>;
    documentUuid?: string | null;
  }): Promise<StudyEntity> {
    const record = await this.prisma.study.create({
      data: {
        encounterUuid: data.encounterUuid,
        patientUuid: data.patientUuid,
        tenantUuid: data.tenantUuid,
        autorUuid: data.autorUuid,
        tipo: data.tipo,
        payload: data.payload as Prisma.InputJsonValue,
        documentUuid: data.documentUuid ?? null,
      },
    });
    return this.mapToEntity(record);
  }

  async findAllByPatient(patientUuid: string, tenantUuid: string): Promise<StudyEntity[]> {
    const records = await this.prisma.study.findMany({
      where: { patientUuid, tenantUuid },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.mapToEntity(record));
  }

  async findOneByUuid(uuid: string, tenantUuid: string): Promise<StudyEntity> {
    const record = await this.prisma.study.findFirst({ where: { uuid, tenantUuid } });
    if (!record) {
      throw new NotFoundException(`Estudio con UUID ${uuid} no encontrado`);
    }
    return this.mapToEntity(record);
  }
}
