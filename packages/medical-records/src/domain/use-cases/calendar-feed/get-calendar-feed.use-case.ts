import { Injectable } from '@nestjs/common';
import { CalendarFeed } from '@prisma/client';
import { CalendarFeedStorage } from '@medical-records/infrastructure/adapters/calendarFeedRepository/calendar-feed.storage';

export interface CalendarFeedStatus {
  /** Token del enlace del usuario, o null si no tiene calendario conectado. */
  token: string | null;
  /** Calendarios ("sede" o "sede:tipo") quitados: se publican vacíos. */
  removedCalendarKeys: string[];
  /** Última vez (ISO) que el teléfono pidió cada calendario: así se sabe cuáles agregó. */
  fetchedCalendars: Record<string, string>;
}

function toFetchedCalendars(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

export function toCalendarFeedStatus(feed: CalendarFeed | null): CalendarFeedStatus {
  return {
    token: feed?.token ?? null,
    removedCalendarKeys: feed?.removedCalendarKeys ?? [],
    fetchedCalendars: toFetchedCalendars(feed?.fetchedCalendars),
  };
}

/** Si el usuario ya tiene enlace de calendario, para mostrárselo de nuevo. */
@Injectable()
export class GetCalendarFeedUseCase {
  constructor(private readonly storage: CalendarFeedStorage) {}

  async execute(userUuid: string, tenantUuid: string): Promise<CalendarFeedStatus> {
    return toCalendarFeedStatus(await this.storage.findByUser(userUuid, tenantUuid));
  }
}
