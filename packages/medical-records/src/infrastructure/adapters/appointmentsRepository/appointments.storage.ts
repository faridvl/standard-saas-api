import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Appointment, AppointmentStatus } from '@medical-records/domain/types/appointment.types';
import { PaginatedResponse } from '@project/core/domain/types/pagination.types';

@Injectable()
export class AppointmentStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: any): Appointment {
    return {
      id: row.uuid,
      patientUUID: row.patientUUID,
      userUUID: row.userUUID,
      typeUUID: row.typeUUID,
      tenantUUID: row.tenantUUID,
      speciality: row.speciality,
      status: row.status as AppointmentStatus,
      schedule: {
        date: row.date,
        startTime: row.startTime,
        endTime: row.endTime,
      },
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patientName: row.patient ? `${row.patient.firstName} ${row.patient.lastName}` : undefined,
      typeName: row.appointmentType?.name,
      medicalControlUUID: row.medicalControl?.uuid,
    };
  }

  async create(data: Partial<Appointment>, tenantUUID: string): Promise<Appointment> {
    const createData: any = {
      patient: {
        connect: { uuid: data.patientUUID },
      },

      userUUID: data.userUUID!,
      tenantUUID: tenantUUID,
      speciality: data.speciality!,
      status: data.status || AppointmentStatus.PENDING,

      date: data.schedule!.date,
      startTime: data.schedule!.startTime,
      endTime: data.schedule!.endTime,
      notes: data.notes,
    };

    if (data.typeUUID) {
      createData.appointmentType = {
        connect: { uuid: data.typeUUID },
      };
    }

    const created = await this.prisma.appointment.create({
      data: createData,
      include: {
        appointmentType: true,
        patient: true,
      },
    });

    return this.mapToDomain(created);
  }

  async findAll(
    tenantUUID: string,
    options: { page: number; limit: number; date?: string; patientId?: string },
  ): Promise<PaginatedResponse<Appointment>> {
    const { page, limit, date, patientId } = options;
    const skip = (page - 1) * limit;

    const where = {
      tenantUUID,
      ...(date && { date: new Date(date) }),
      ...(patientId && { patientUUID: patientId }),
    };

    const [total, rows] = await Promise.all([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        include: {
          appointmentType: true,
          patient: { select: { firstName: true, lastName: true } },
          medicalControl: { select: { uuid: true } },
        },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    // Aquí es donde el error desaparece: mapToDomain transforma el tipo
    return {
      data: rows.map((row) => this.mapToDomain(row)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(uuid: string, tenantUUID: string): Promise<Appointment> {
    const row = await this.prisma.appointment.findFirst({
      where: { uuid, tenantUUID },
      include: { appointmentType: true, patient: true, medicalControl: true },
    });

    if (!row) throw new NotFoundException('Cita no encontrada');
    return this.mapToDomain(row);
  }

  async update(uuid: string, tenantUUID: string, data: Partial<Appointment>): Promise<Appointment> {
    const updated = await this.prisma.appointment.update({
      where: { uuid },
      data: {
        status: data.status,
        notes: data.notes,
        ...(data.schedule && {
          startTime: data.schedule.startTime,
          endTime: data.schedule.endTime,
        }),
      },
      include: { appointmentType: true, patient: true },
    });
    return this.mapToDomain(updated);
  }

  async delete(uuid: string, tenantUUID: string): Promise<{ success: boolean }> {
    await this.prisma.appointment.delete({
      where: { uuid, tenantUUID },
    });
    return { success: true };
  }

  async findByPatient(patientUUID: string, tenantUUID: string): Promise<Appointment[]> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        patientUUID,
        tenantUUID,
      },
      include: {
        appointmentType: true,
        patient: true, // Esto trae la info básica del paciente en cada cita
        medicalControl: { select: { uuid: true } },
      },
      orderBy: { startTime: 'desc' }, // Citas más recientes primero
    });

    return rows.map((row) => this.mapToDomain(row));
  }
}
