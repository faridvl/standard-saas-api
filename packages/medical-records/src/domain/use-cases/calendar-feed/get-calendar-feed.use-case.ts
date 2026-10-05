import { Injectable } from '@nestjs/common';
import { CalendarFeedStorage } from '@medical-records/infrastructure/adapters/calendarFeedRepository/calendar-feed.storage';

export interface CalendarFeedStatus {
  /** Token del enlace del usuario, o null si no tiene calendario conectado. */
  token: string | null;
}

/** Si el usuario ya tiene enlace de calendario, para mostrárselo de nuevo. */
@Injectable()
export class GetCalendarFeedUseCase {
  constructor(private readonly storage: CalendarFeedStorage) {}

  async execute(userUuid: string, tenantUuid: string): Promise<CalendarFeedStatus> {
    const feed = await this.storage.findByUser(userUuid, tenantUuid);
    return { token: feed?.token ?? null };
  }
}
