import { Module } from '@nestjs/common';
import { CalendarFeedController } from '../controllers/calendar-feed.controller';
import { CalendarFeedStorage } from '@medical-records/infrastructure/adapters/calendarFeedRepository/calendar-feed.storage';
import {
  BuildCalendarFeedUseCase,
  GetCalendarFeedUseCase,
  IssueCalendarFeedUseCase,
  RevokeCalendarFeedUseCase,
  SetCalendarVisibilityUseCase,
} from '@medical-records/domain/use-cases/calendar-feed';

const CONTROLLERS = [CalendarFeedController];
const USE_CASES = [
  BuildCalendarFeedUseCase,
  GetCalendarFeedUseCase,
  IssueCalendarFeedUseCase,
  RevokeCalendarFeedUseCase,
  SetCalendarVisibilityUseCase,
];
const STORAGES = [CalendarFeedStorage];

@Module({
  controllers: [...CONTROLLERS],
  providers: [...USE_CASES, ...STORAGES],
})
export class CalendarFeedModule {}
