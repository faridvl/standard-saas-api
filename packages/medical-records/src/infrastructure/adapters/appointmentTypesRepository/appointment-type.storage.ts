import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentTypeEntity } from '@medical-records/domain/entities/appointment-type.entity';
import { CreateAppointmentTypeDto } from '@medical-records/app/dtos/appointment-type.dto';

@Injectable()
export class AppointmentTypeStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: {
    uuid: string;
    name: string;
    duration: number | null;
    color: string | null;
    speciality: string | null;
    tenantUUID: string;
  }): AppointmentTypeEntity {
    return {
      uuid: row.uuid,
      name: row.name,
      duration: row.duration,
      color: row.color,
      speciality: row.speciality,
      tenantUUID: row.tenantUUID,
    };
  }

  async findAll(tenantUUID: string): Promise<AppointmentTypeEntity[]> {
    const rows = await this.prisma.appointmentType.findMany({
      where: { tenantUUID },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => this.mapToDomain(row));
  }

  async create(tenantUUID: string, dto: CreateAppointmentTypeDto): Promise<AppointmentTypeEntity> {
    const row = await this.prisma.appointmentType.create({
      data: {
        name: dto.name,
        duration: dto.duration ?? null,
        color: dto.color ?? null,
        speciality: dto.speciality ?? null,
        tenantUUID,
      },
    });
    return this.mapToDomain(row);
  }
}
