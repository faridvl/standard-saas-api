import { Injectable } from '@nestjs/common';
import { PatientContact } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePatientContactData {
  patientUuid: string;
  tenantUuid: string;
  name: string;
  phone: string;
}

export interface SyncPatientContactItem {
  uuid?: string;
  name: string;
  phone: string;
}

@Injectable()
export class PatientContactStorage {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePatientContactData): Promise<PatientContact> {
    return await this.prisma.patientContact.create({ data });
  }

  async createMany(data: CreatePatientContactData[]): Promise<void> {
    if (data.length === 0) return;
    await this.prisma.patientContact.createMany({ data });
  }

  async findAllByPatient(patientUuid: string, tenantUuid: string): Promise<PatientContact[]> {
    return await this.prisma.patientContact.findMany({
      where: { patientUuid, tenantUuid },
      orderBy: { createdAt: 'asc' },
    });
  }

  async delete(uuid: string, tenantUuid: string): Promise<PatientContact> {
    return await this.prisma.patientContact.delete({
      where: { uuid, tenantUuid },
    });
  }

  /**
   * Reemplaza la lista de contactos de un paciente por la que llega del
   * formulario: actualiza los que traen uuid (ya existían), crea los que no
   * traen uuid, y elimina los que existían pero ya no vienen en la lista.
   */
  async sync(patientUuid: string, tenantUuid: string, items: SyncPatientContactItem[]): Promise<PatientContact[]> {
    const existing = await this.findAllByPatient(patientUuid, tenantUuid);
    const incomingUuids = new Set(items.filter((item) => item.uuid).map((item) => item.uuid));

    const toDelete = existing.filter((contact) => !incomingUuids.has(contact.uuid));
    const toUpdate = items.filter((item) => item.uuid);
    const toCreate = items.filter((item) => !item.uuid);

    await this.prisma.$transaction([
      ...toDelete.map((contact) =>
        this.prisma.patientContact.delete({ where: { uuid: contact.uuid, tenantUuid } }),
      ),
      ...toUpdate.map((item) =>
        this.prisma.patientContact.update({
          where: { uuid: item.uuid, tenantUuid },
          data: { name: item.name, phone: item.phone },
        }),
      ),
      ...(toCreate.length > 0
        ? [
            this.prisma.patientContact.createMany({
              data: toCreate.map((item) => ({
                patientUuid,
                tenantUuid,
                name: item.name,
                phone: item.phone,
              })),
            }),
          ]
        : []),
    ]);

    return await this.findAllByPatient(patientUuid, tenantUuid);
  }
}
