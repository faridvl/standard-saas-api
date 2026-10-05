import { Injectable } from '@nestjs/common';
import {
  CalendarEventRow,
  CalendarFeedStorage,
} from '@medical-records/infrastructure/adapters/calendarFeedRepository/calendar-feed.storage';
import { DEFAULT_APPOINTMENT_HOUR_UTC } from '@medical-records/domain/types/appointment.types';
import { buildIcsCalendar, IcsEvent } from '@medical-records/domain/utils/ics-calendar.util';

/** Ventana publicada: un mes hacia atrás (lo reciente) y un año hacia adelante. */
const DAYS_BACK = 30;
const DAYS_AHEAD = 365;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Se sugiere al teléfono leer el enlace cada 15 minutos. */
const REFRESH_MINUTES = 15;

const CALENDAR_NAME = 'Citas';
const NAME_SEPARATOR = ' · ';

/** Dominio del UID de cada evento: estable, así el teléfono actualiza en vez de duplicar. */
const UID_DOMAIN = 'standard-saas.com';

export interface CalendarFeedOptions {
  /** Solo las citas de esta sede: un calendario por sede, cada uno de su color. */
  branchUuid?: string;
  /** Color del calendario (`#rrggbb`), lo decide el back-office con su paleta. */
  color?: string;
}

/** Cita guardada solo con día (sin hora real): va como evento de día completo. */
function isWithoutTime(startTime: Date): boolean {
  return (
    startTime.getUTCHours() === DEFAULT_APPOINTMENT_HOUR_UTC &&
    startTime.getUTCMinutes() === 0 &&
    startTime.getUTCSeconds() === 0
  );
}

/**
 * "María Pérez · Control": nombre completo del paciente, por decisión de la
 * clínica. Ojo: el calendario vive en teléfonos personales (y su iCloud).
 */
function toIcsEvent(row: CalendarEventRow, isSingleBranch: boolean): IcsEvent {
  const branchName = row.branch?.name;
  const patientName = `${row.patient.firstName} ${row.patient.lastName}`.trim();
  const summaryParts = [
    patientName,
    row.appointmentType.name,
    // En el calendario de una sede, la sede ya está en el nombre del calendario.
    ...(!isSingleBranch && branchName ? [branchName] : []),
  ];

  return {
    uid: `${row.uuid}@${UID_DOMAIN}`,
    summary: summaryParts.join(NAME_SEPARATOR),
    description: branchName,
    start: row.startTime,
    end: row.endTime,
    isAllDay: isWithoutTime(row.startTime),
    lastModified: row.updatedAt,
  };
}

/**
 * El calendario (.ics) de un enlace. Un token que no existe (revocado o
 * inventado) devuelve un calendario vacío y no un error: así el teléfono borra
 * las citas que tenía en vez de quedarse con las viejas.
 */
@Injectable()
export class BuildCalendarFeedUseCase {
  constructor(private readonly storage: CalendarFeedStorage) {}

  async execute(token: string, options: CalendarFeedOptions = {}): Promise<string> {
    const feed = await this.storage.findByToken(token);
    if (!feed) {
      return buildIcsCalendar({ name: CALENDAR_NAME, refreshMinutes: REFRESH_MINUTES, events: [] });
    }

    const branchName = options.branchUuid
      ? await this.storage.findBranchName(options.branchUuid, feed.tenantUuid)
      : null;
    // Una sede de otra clínica (o inexistente) no muestra nada.
    const isUnknownBranch = Boolean(options.branchUuid) && !branchName;
    // Una sede quitada conserva su nombre para que el teléfono la siga
    // reconociendo, pero sin citas.
    const isRemovedBranch =
      Boolean(options.branchUuid) && feed.removedBranchUuids.includes(options.branchUuid ?? '');

    const now = Date.now();
    const rows =
      isUnknownBranch || isRemovedBranch
        ? []
        : await this.storage.findEvents(
            feed.tenantUuid,
            new Date(now - DAYS_BACK * MS_PER_DAY),
            new Date(now + DAYS_AHEAD * MS_PER_DAY),
            options.branchUuid,
          );

    return buildIcsCalendar({
      name: branchName ? `${CALENDAR_NAME}${NAME_SEPARATOR}${branchName}` : CALENDAR_NAME,
      refreshMinutes: REFRESH_MINUTES,
      color: options.color,
      events: rows.map((row) => toIcsEvent(row, Boolean(branchName))),
    });
  }
}
