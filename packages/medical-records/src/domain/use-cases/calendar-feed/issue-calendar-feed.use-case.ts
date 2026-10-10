import { randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { CalendarFeedStorage } from '@medical-records/infrastructure/adapters/calendarFeedRepository/calendar-feed.storage';
import { CalendarFeedStatus, toCalendarFeedStatus } from './get-calendar-feed.use-case';

/** 24 bytes al azar = 32 caracteres base64url: imposible de adivinar. */
const TOKEN_BYTES = 24;

/**
 * Crea el enlace de calendario del usuario. Si ya tiene uno lo devuelve igual:
 * cambiarlo dejaría sin citas a todos los calendarios que ya agregó al teléfono.
 */
@Injectable()
export class IssueCalendarFeedUseCase {
  constructor(private readonly storage: CalendarFeedStorage) {}

  async execute(userUuid: string, tenantUuid: string): Promise<CalendarFeedStatus> {
    const existing = await this.storage.findByUser(userUuid, tenantUuid);
    if (existing) return toCalendarFeedStatus(existing);

    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    return toCalendarFeedStatus(await this.storage.upsertToken(userUuid, tenantUuid, token));
  }
}
