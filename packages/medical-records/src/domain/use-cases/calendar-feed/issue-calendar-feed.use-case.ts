import { randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { CalendarFeedStorage } from '@medical-records/infrastructure/adapters/calendarFeedRepository/calendar-feed.storage';
import { CalendarFeedStatus } from './get-calendar-feed.use-case';

/** 24 bytes al azar = 32 caracteres base64url: imposible de adivinar. */
const TOKEN_BYTES = 24;

/**
 * Crea el enlace de calendario del usuario, o lo regenera si ya tenía: el
 * token viejo deja de servir en el acto (su calendario queda vacío en la
 * siguiente actualización del teléfono).
 */
@Injectable()
export class IssueCalendarFeedUseCase {
  constructor(private readonly storage: CalendarFeedStorage) {}

  async execute(userUuid: string, tenantUuid: string): Promise<CalendarFeedStatus> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const feed = await this.storage.upsertToken(userUuid, tenantUuid, token);
    return { token: feed.token };
  }
}
