import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Encounter as PrismaEncounter } from '@prisma/client';
import { EncounterEntity, EncounterDetail } from '@medical-records/domain/entities/encounter.entity';
import { EncounterStatus } from '@medical-records/domain/types/encounter.types';

@Injectable()
export class EncounterStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(record: PrismaEncounter): EncounterEntity {
    return {
      uuid: record.uuid,
      patientUuid: record.patientUuid,
      tenantUuid: record.tenantUuid,
      autorUuid: record.autorUuid,
      especialidad: record.especialidad,
      appointmentUuid: record.appointmentUuid,
      startedAt: record.startedAt.toISOString(),
      closedAt: record.closedAt?.toISOString() ?? null,
      status: record.status as EncounterStatus,
    };
  }

  async save(data: {
    patientUuid: string;
    tenantUuid: string;
    autorUuid: string;
    especialidad: string;
    appointmentUuid?: string | null;
  }): Promise<EncounterEntity> {
    const record = await this.prisma.encounter.create({
      data: {
        patientUuid: data.patientUuid,
        tenantUuid: data.tenantUuid,
        autorUuid: data.autorUuid,
        especialidad: data.especialidad,
        appointmentUuid: data.appointmentUuid ?? null,
        status: EncounterStatus.OPEN,
      },
    });
    return this.mapToEntity(record);
  }

  async findAllByPatient(patientUuid: string, tenantUuid: string): Promise<EncounterEntity[]> {
    const records = await this.prisma.encounter.findMany({
      where: { patientUuid, tenantUuid },
      orderBy: { startedAt: 'desc' },
    });
    return records.map((record) => this.mapToEntity(record));
  }

  async findOneByUuid(uuid: string, tenantUuid: string): Promise<EncounterDetail | null> {
    const record = await this.prisma.encounter.findFirst({
      where: { uuid, tenantUuid },
      include: {
        medicalControls: true,
        maintenances: true,
        studies: true,
      },
    });

    if (!record) return null;

    const { medicalControls, maintenances, studies, ...encounter } = record;

    return {
      ...this.mapToEntity(encounter),
      medicalControls,
      maintenances,
      studies,
    };
  }

  async close(uuid: string, tenantUuid: string): Promise<EncounterEntity> {
    const existing = await this.prisma.encounter.findFirst({ where: { uuid, tenantUuid } });
    if (!existing) {
      throw new NotFoundException(`Encuentro con UUID ${uuid} no encontrado`);
    }

    // Encounter cerrado → sin update posterior. Reabrir significa crear un
    // nuevo encuentro vinculado, no reescribir este (append-only, NOM-004 5.11).
    if (existing.status === EncounterStatus.CLOSED) {
      return this.mapToEntity(existing);
    }

    const record = await this.prisma.encounter.update({
      where: { uuid },
      data: { status: EncounterStatus.CLOSED, closedAt: new Date() },
    });
    return this.mapToEntity(record);
  }
}
