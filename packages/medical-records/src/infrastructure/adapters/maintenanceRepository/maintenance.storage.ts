import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenanceEntity } from '@medical-records/domain/entities/maintenance.entity';

@Injectable()
export class MaintenanceStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(record: {
    uuid: string;
    patientUuid: string;
    tenantUuid: string;
    performedBy: string;
    performedAt: Date;
    description: string;
    nextMaintenanceAt: Date | null;
    deviceUuid: string | null;
    createdAt: Date;
  }): MaintenanceEntity {
    return {
      uuid: record.uuid,
      patientUuid: record.patientUuid,
      tenantUuid: record.tenantUuid,
      performedBy: record.performedBy,
      performedAt: record.performedAt.toISOString(),
      description: record.description,
      nextMaintenanceAt: record.nextMaintenanceAt?.toISOString() ?? null,
      deviceUuid: record.deviceUuid,
      createdAt: record.createdAt.toISOString(),
    };
  }

  async save(data: {
    patientUuid: string;
    tenantUuid: string;
    performedBy: string;
    description: string;
    nextMaintenanceAt?: string | null;
    deviceUuid?: string | null;
  }): Promise<MaintenanceEntity> {
    const record = await this.prisma.maintenance.create({
      data: {
        patientUuid: data.patientUuid,
        tenantUuid: data.tenantUuid,
        performedBy: data.performedBy,
        description: data.description,
        nextMaintenanceAt: data.nextMaintenanceAt ? new Date(data.nextMaintenanceAt) : null,
        deviceUuid: data.deviceUuid ?? null,
      },
    });
    return this.mapToEntity(record);
  }

  async findByPatient(patientUuid: string, tenantUuid: string): Promise<MaintenanceEntity[]> {
    const records = await this.prisma.maintenance.findMany({
      where: { patientUuid, tenantUuid },
      orderBy: { performedAt: 'desc' },
    });
    return records.map((record) => this.mapToEntity(record));
  }

  async findUpcoming(tenantUuid: string, month: string): Promise<MaintenanceEntity[]> {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const records = await this.prisma.maintenance.findMany({
      where: {
        tenantUuid,
        nextMaintenanceAt: { gte: start, lt: end },
      },
      orderBy: { nextMaintenanceAt: 'asc' },
    });
    return records.map((record) => this.mapToEntity(record));
  }
}
