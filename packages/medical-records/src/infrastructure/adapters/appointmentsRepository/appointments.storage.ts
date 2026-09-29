import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Appointment, AppointmentStatus } from '@medical-records/domain/types/appointment.types';
import { MedicalSpeciality } from '@medical-records/domain/types/medical-control-content.types';
import { PaginatedResponse } from '@project/core/domain/types/pagination.types';

/**
 * Shape mínimo que necesita `mapToDomain`. Los distintos métodos de este
 * storage piden diferentes `include`/`select` a Prisma (algunos traen
 * `medicalControl`, otros no; `patient` completo o solo nombre), así que se
 * describe la forma estructural en vez de fijar un único `GetPayload`.
 */
type AppointmentRow = Pick<
  Prisma.AppointmentGetPayload<Record<string, never>>,
  | 'uuid'
  | 'patientUUID'
  | 'userUUID'
  | 'typeUUID'
  | 'branchUUID'
  | 'tenantUUID'
  | 'speciality'
  | 'status'
  | 'date'
  | 'startTime'
  | 'endTime'
  | 'notes'
  | 'createdAt'
  | 'updatedAt'
> & {
  patient?: { firstName: string; lastName: string } | null;
  appointmentType?: { name: string } | null;
  medicalControl?: { uuid: string } | null;
};

type AppointmentCreateData = Prisma.AppointmentCreateInput;

@Injectable()
export class AppointmentStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: AppointmentRow): Appointment {
    return {
      id: row.uuid,
      patientUUID: row.patientUUID,
      userUUID: row.userUUID,
      typeUUID: row.typeUUID,
      branchUUID: row.branchUUID,
      tenantUUID: row.tenantUUID,
      speciality: row.speciality as MedicalSpeciality,
      status: row.status as AppointmentStatus,
      schedule: {
        date: row.date,
        startTime: row.startTime,
        endTime: row.endTime,
      },
      notes: row.notes ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patientName: row.patient ? `${row.patient.firstName} ${row.patient.lastName}` : undefined,
      typeName: row.appointmentType?.name,
      medicalControlUUID: row.medicalControl?.uuid,
    };
  }

  async create(data: Partial<Appointment>, tenantUUID: string): Promise<Appointment> {
    const createData: Partial<AppointmentCreateData> = {
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

    if (data.branchUUID) {
      createData.branch = {
        connect: { uuid: data.branchUUID },
      };
    }

    const created = await this.prisma.appointment.create({
      data: createData as AppointmentCreateData,
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
      ...(date && {
        startTime: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lt: new Date(`${date}T23:59:59.999Z`),
        },
      }),
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
        ...(data.branchUUID !== undefined && { branchUUID: data.branchUUID }),
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

  /** Reemplaza las citas CONFIRMED futuras de un paciente (previo a agendar una nueva). */
  async completeConfirmedFutureByPatient(patientUUID: string, tenantUUID: string): Promise<void> {
    await this.prisma.appointment.updateMany({
      where: {
        patientUUID,
        tenantUUID,
        status: AppointmentStatus.CONFIRMED,
        startTime: { gte: new Date() },
      },
      data: { status: AppointmentStatus.COMPLETED },
    });
  }

  /**
   * Cancela las citas CONFIRMED futuras de un paciente. Se usa cuando la
   * clínica llama y el paciente no confirma: la fecha que tenía deja de
   * valer y se vuelve a un mes tentativo. A diferencia de
   * `completeConfirmedFutureByPatient`, aquí la cita no se dio por atendida,
   * así que queda CANCELLED y no COMPLETED.
   */
  async cancelConfirmedFutureByPatient(patientUUID: string, tenantUUID: string): Promise<void> {
    await this.prisma.appointment.updateMany({
      where: {
        patientUUID,
        tenantUUID,
        status: AppointmentStatus.CONFIRMED,
        startTime: { gte: new Date() },
      },
      data: { status: AppointmentStatus.CANCELLED },
    });
  }

  /**
   * Meses (YYYY-MM, UTC) que tienen al menos una cita CONFIRMED futura para
   * el tenant. Mismo criterio que el filtro `nextAppointmentMonth` de
   * /patients, para poblar un selector de filtro sin listar meses vacios.
   */
  async findScheduledMonths(tenantUUID: string): Promise<string[]> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        tenantUUID,
        status: AppointmentStatus.CONFIRMED,
        startTime: { gte: new Date() },
      },
      select: { startTime: true },
    });

    const months = new Set(rows.map((row) => row.startTime.toISOString().slice(0, 7)));

    return Array.from(months).sort();
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
