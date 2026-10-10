import { Injectable } from '@nestjs/common';
import { CalendarFeed } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus } from '@medical-records/domain/types/appointment.types';

/** Lo que necesita un evento del calendario suscrito, ya con nombres resueltos. */
export interface CalendarEventRow {
  uuid: string;
  startTime: Date;
  endTime: Date;
  updatedAt: Date;
  patient: { firstName: string; lastName: string };
  appointmentType: { name: string };
  branch: { name: string } | null;
}

/** Estados que no son una cita en pie: no se publican en el calendario. */
const HIDDEN_STATUSES = [AppointmentStatus.CANCELLED, AppointmentStatus.TENTATIVE];

@Injectable()
export class CalendarFeedStorage {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userUuid: string, tenantUuid: string): Promise<CalendarFeed | null> {
    return await this.prisma.calendarFeed.findFirst({ where: { userUuid, tenantUuid } });
  }

  async findByToken(token: string): Promise<CalendarFeed | null> {
    return await this.prisma.calendarFeed.findUnique({ where: { token } });
  }

  /** Crea el enlace del usuario, o le cambia el token si ya tenía (el viejo deja de servir). */
  async upsertToken(userUuid: string, tenantUuid: string, token: string): Promise<CalendarFeed> {
    return await this.prisma.calendarFeed.upsert({
      where: { userUuid },
      create: { userUuid, tenantUuid, token },
      update: { token, tenantUuid },
    });
  }

  async updateRemovedCalendars(
    userUuid: string,
    removedCalendarKeys: string[],
  ): Promise<CalendarFeed> {
    return await this.prisma.calendarFeed.update({
      where: { userUuid },
      data: { removedCalendarKeys },
    });
  }

  /**
   * Anota que el teléfono acaba de pedir un calendario. `jsonb_set` en la base
   * y no leer-modificar-escribir: el teléfono pide varios calendarios a la vez.
   */
  async markFetched(feedId: number, calendarKey: string, fetchedAt: Date): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "CalendarFeed"
      SET "fetchedCalendars" = jsonb_set("fetchedCalendars", ARRAY[${calendarKey}], to_jsonb(${fetchedAt.toISOString()}::text))
      WHERE "id" = ${feedId}
    `;
  }

  async deleteByUser(userUuid: string, tenantUuid: string): Promise<void> {
    await this.prisma.calendarFeed.deleteMany({ where: { userUuid, tenantUuid } });
  }

  async findBranchName(branchUuid: string, tenantUuid: string): Promise<string | null> {
    const branch = await this.prisma.branch.findFirst({
      where: { uuid: branchUuid, tenantUuid },
      select: { name: true },
    });
    return branch?.name ?? null;
  }

  async findAppointmentTypeName(typeUuid: string, tenantUuid: string): Promise<string | null> {
    const type = await this.prisma.appointmentType.findFirst({
      where: { uuid: typeUuid, tenantUUID: tenantUuid },
      select: { name: true },
    });
    return type?.name ?? null;
  }

  /** Citas en pie de la clínica entre dos fechas (de una sede y un tipo, si se piden), con paciente, tipo y sede. */
  async findEvents(
    tenantUuid: string,
    from: Date,
    to: Date,
    branchUuid?: string,
    typeUuid?: string,
  ): Promise<CalendarEventRow[]> {
    return await this.prisma.appointment.findMany({
      where: {
        tenantUUID: tenantUuid,
        ...(branchUuid && { branchUUID: branchUuid }),
        ...(typeUuid && { typeUUID: typeUuid }),
        status: { notIn: HIDDEN_STATUSES },
        startTime: { gte: from, lt: to },
      },
      select: {
        uuid: true,
        startTime: true,
        endTime: true,
        updatedAt: true,
        patient: { select: { firstName: true, lastName: true } },
        appointmentType: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }
}
