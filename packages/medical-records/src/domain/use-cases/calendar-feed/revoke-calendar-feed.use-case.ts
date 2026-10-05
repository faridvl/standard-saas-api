import { Injectable } from '@nestjs/common';
import { CalendarFeedStorage } from '@medical-records/infrastructure/adapters/calendarFeedRepository/calendar-feed.storage';

/** Desconecta el calendario del usuario: su enlace deja de devolver citas. */
@Injectable()
export class RevokeCalendarFeedUseCase {
  constructor(private readonly storage: CalendarFeedStorage) {}

  async execute(userUuid: string, tenantUuid: string): Promise<{ success: boolean }> {
    await this.storage.deleteByUser(userUuid, tenantUuid);
    return { success: true };
  }
}
