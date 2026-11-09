import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentTypeEntity } from '@medical-records/domain/entities/appointment-type.entity';
import {
  CreateAppointmentTypeDto,
  UpdateAppointmentTypeDto,
} from '@medical-records/app/dtos/appointment-type.dto';
import {
  AppointmentStatus,
  DEFAULT_APPOINTMENT_HOUR_UTC,
} from '@medical-records/domain/types/appointment.types';
import { startOfClinicDay } from '@medical-records/domain/utils/clinic-day.util';

const CLOSED_APPOINTMENT_STATUSES: string[] = [
  AppointmentStatus.CANCELLED,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.EXPIRED,
];

@Injectable()
export class AppointmentTypeStorage {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: {
    uuid: string;
    name: string;
    duration: number | null;
    color: string | null;
    speciality: string | null;
    isControl: boolean;
    tenantUUID: string;
  }): AppointmentTypeEntity {
    return {
      uuid: row.uuid,
      name: row.name,
      duration: row.duration,
      color: row.color,
      speciality: row.speciality,
      isControl: row.isControl,
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

  async findByUuid(tenantUUID: string, uuid: string): Promise<AppointmentTypeEntity | null> {
    const row = await this.prisma.appointmentType.findFirst({ where: { uuid, tenantUUID } });
    return row ? this.mapToDomain(row) : null;
  }

  async create(tenantUUID: string, dto: CreateAppointmentTypeDto): Promise<AppointmentTypeEntity> {
    const row = await this.prisma.appointmentType.create({
      data: {
        name: dto.name,
        duration: dto.duration ?? null,
        color: dto.color ?? null,
        speciality: dto.speciality ?? null,
        isControl: dto.isControl ?? false,
        tenantUUID,
      },
    });
    return this.mapToDomain(row);
  }

  /**
   * Solo cambia los campos recibidos; null limpia uno opcional. Marcar un tipo
   * como control desmarca al que lo era: hay uno por tenant como máximo.
   * Una duración nueva alcanza a las citas de hoy en adelante.
   */
  async update(
    tenantUUID: string,
    uuid: string,
    dto: UpdateAppointmentTypeDto,
  ): Promise<AppointmentTypeEntity | null> {
    const { count } = await this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.appointmentType.findFirst({
        where: { uuid, tenantUUID },
        select: { duration: true },
      });
      if (dto.isControl) {
        await transaction.appointmentType.updateMany({
          where: { tenantUUID, isControl: true, NOT: { uuid } },
          data: { isControl: false },
        });
      }
      const updated = await transaction.appointmentType.updateMany({
        where: { uuid, tenantUUID },
        data: {
          name: dto.name,
          duration: dto.duration,
          color: dto.color,
          speciality: dto.speciality,
          isControl: dto.isControl,
        },
      });
      if (
        updated.count > 0 &&
        typeof dto.duration === 'number' &&
        dto.duration > 0 &&
        dto.duration !== previous?.duration
      ) {
        await this.applyDurationToUpcomingAppointments(transaction, tenantUUID, uuid, dto.duration);
      }
      return updated;
    });
    return count > 0 ? this.findByUuid(tenantUUID, uuid) : null;
  }

  /**
   * Las citas guardan su propio fin y la agenda lo respeta, así que hay que
   * moverlo. Las "sin hora" (08:00 UTC en punto) no tienen fin real y se dejan.
   * Las cerradas tampoco se tocan: reescribirlas cambia su updatedAt y la agenda
   * dejaría de reconocer las completadas por reagendado.
   */
  private async applyDurationToUpcomingAppointments(
    transaction: Prisma.TransactionClient,
    tenantUUID: string,
    typeUUID: string,
    durationMinutes: number,
  ): Promise<void> {
    const now = new Date();
    const fromInstant = startOfClinicDay(now).toISOString();
    const updatedAtInstant = now.toISOString();
    const closedStatuses = CLOSED_APPOINTMENT_STATUSES;
    await transaction.$executeRaw`
      UPDATE "Appointment"
      SET "endTime" = "startTime" + (${durationMinutes}::int * INTERVAL '1 minute'),
          "updatedAt" = (${updatedAtInstant}::timestamptz AT TIME ZONE 'UTC')
      WHERE "typeUUID" = ${typeUUID}
        AND "tenantUUID" = ${tenantUUID}
        AND NOT ("status"::text = ANY(${closedStatuses}::text[]))
        AND "startTime" >= (${fromInstant}::timestamptz AT TIME ZONE 'UTC')
        AND date_trunc('minute', "startTime")::time <> make_time(${DEFAULT_APPOINTMENT_HOUR_UTC}::int, 0, 0)
    `;
  }

  async delete(tenantUUID: string, uuid: string): Promise<void> {
    const appointmentCount = await this.prisma.appointment.count({
      where: { typeUUID: uuid },
    });

    if (appointmentCount > 0) {
      throw new ConflictException(
        `No se puede eliminar el tipo de cita porque tiene ${appointmentCount} ${appointmentCount === 1 ? 'cita registrada' : 'citas registradas'}.`,
        JSON.stringify({ appointmentCount }),
      );
    }

    await this.prisma.appointmentType.deleteMany({
      where: { uuid, tenantUUID },
    });
  }
}
