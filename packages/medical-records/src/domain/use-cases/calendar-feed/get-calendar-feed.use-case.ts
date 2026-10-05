import { Injectable } from '@nestjs/common';
import { CalendarFeed } from '@prisma/client';
import { CalendarFeedStorage } from '@medical-records/infrastructure/adapters/calendarFeedRepository/calendar-feed.storage';

export interface CalendarFeedStatus {
  /** Token del enlace del usuario, o null si no tiene calendario conectado. */
  token: string | null;
  /** Sedes quitadas desde el back-office: su calendario se publica vacío. */
  removedBranchUuids: string[];
}

export function toCalendarFeedStatus(feed: CalendarFeed | null): CalendarFeedStatus {
  return { token: feed?.token ?? null, removedBranchUuids: feed?.removedBranchUuids ?? [] };
}

/** Si el usuario ya tiene enlace de calendario, para mostrárselo de nuevo. */
@Injectable()
export class GetCalendarFeedUseCase {
  constructor(private readonly storage: CalendarFeedStorage) {}

  async execute(userUuid: string, tenantUuid: string): Promise<CalendarFeedStatus> {
    return toCalendarFeedStatus(await this.storage.findByUser(userUuid, tenantUuid));
  }
}
