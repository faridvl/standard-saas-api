import { Injectable, Logger } from '@nestjs/common';
import {
  CalendarEventRow,
  CalendarFeedStorage,
} from '@medical-records/infrastructure/adapters/calendarFeedRepository/calendar-feed.storage';
import { DEFAULT_APPOINTMENT_HOUR_UTC } from '@medical-records/domain/types/appointment.types';
import { buildIcsCalendar, IcsEvent } from '@medical-records/domain/utils/ics-calendar.util';
import { buildCalendarKey } from '@medical-records/domain/utils/calendar-key.util';

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
  /** Además, solo las de este tipo (requiere sede): "Ciudad Neily · Control". */
  typeUuid?: string;
  /** Color del calendario (`#rrggbb`), lo decide el back-office con su paleta. */
  color?: string;
}

/** Lo que el nombre del calendario ya dice no se repite en cada evento. */
interface CalendarScope {
  hasBranch: boolean;
  hasType: boolean;
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
function toIcsEvent(row: CalendarEventRow, scope: CalendarScope): IcsEvent {
  const branchName = row.branch?.name;
  const patientName = `${row.patient.firstName} ${row.patient.lastName}`.trim();
  const summaryParts = [
    patientName,
    ...(!scope.hasType ? [row.appointmentType.name] : []),
    ...(!scope.hasBranch && branchName ? [branchName] : []),
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
  private readonly logger = new Logger(BuildCalendarFeedUseCase.name);

  constructor(private readonly storage: CalendarFeedStorage) {}

  async execute(token: string, options: CalendarFeedOptions = {}): Promise<string> {
    const feed = await this.storage.findByToken(token);
    if (!feed) {
      return buildIcsCalendar({ name: CALENDAR_NAME, refreshMinutes: REFRESH_MINUTES, events: [] });
    }

    const { branchUuid } = options;
    const typeUuid = branchUuid ? options.typeUuid : undefined;
    const [branchName, typeName] = await Promise.all([
      branchUuid ? this.storage.findBranchName(branchUuid, feed.tenantUuid) : null,
      typeUuid ? this.storage.findAppointmentTypeName(typeUuid, feed.tenantUuid) : null,
    ]);
    // Una sede o un tipo de otra clínica (o inexistente) no muestra nada.
    const isUnknown = (Boolean(branchUuid) && !branchName) || (Boolean(typeUuid) && !typeName);
    const calendarKey = branchUuid ? buildCalendarKey(branchUuid, typeUuid) : null;
    // Un calendario quitado conserva su nombre para que el teléfono lo siga
    // reconociendo, pero sin citas.
    const isRemoved = calendarKey !== null && feed.removedCalendarKeys.includes(calendarKey);

    const now = Date.now();
    const rows =
      isUnknown || isRemoved
        ? []
        : await this.storage.findEvents(
            feed.tenantUuid,
            new Date(now - DAYS_BACK * MS_PER_DAY),
            new Date(now + DAYS_AHEAD * MS_PER_DAY),
            branchUuid,
            typeUuid,
          );

    if (calendarKey && !isUnknown) await this.recordFetch(feed.id, calendarKey);

    return buildIcsCalendar({
      name: this.buildName(branchName, typeName),
      refreshMinutes: REFRESH_MINUTES,
      color: options.color,
      events: rows.map((row) =>
        toIcsEvent(row, { hasBranch: Boolean(branchName), hasType: Boolean(typeName) }),
      ),
    });
  }

  /** "Ciudad Neily · Control" o "Citas · Ciudad Neily". */
  private buildName(branchName: string | null, typeName: string | null): string {
    if (branchName && typeName) return `${branchName}${NAME_SEPARATOR}${typeName}`;
    if (branchName) return `${CALENDAR_NAME}${NAME_SEPARATOR}${branchName}`;
    return CALENDAR_NAME;
  }

  /** Si anotar la consulta falla, el teléfono igual recibe su calendario. */
  private async recordFetch(feedId: number, calendarKey: string): Promise<void> {
    try {
      await this.storage.markFetched(feedId, calendarKey, new Date());
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`No se pudo anotar la consulta del calendario ${calendarKey}: ${reason}`);
    }
  }
}
