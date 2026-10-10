import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload, ZodValidationPipe } from '@project/core';
import {
  SetCalendarVisibilityDto,
  SetCalendarVisibilitySchema,
} from '@medical-records/app/dtos/calendar-feed.dto';
import {
  BuildCalendarFeedUseCase,
  CalendarFeedStatus,
  GetCalendarFeedUseCase,
  IssueCalendarFeedUseCase,
  RevokeCalendarFeedUseCase,
  SetCalendarVisibilityUseCase,
} from '@medical-records/domain/use-cases/calendar-feed';

/** El teléfono pide `/calendar-feed/<token>.ics`: se quita la extensión para quedarse con el token. */
const ICS_EXTENSION = /\.ics$/i;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Calendario suscrito (webcal). Administrar el enlace pide sesión; leer el
 * calendario no, porque la app de calendario del teléfono no puede iniciar
 * sesión: el token secreto del enlace hace de llave.
 */
@Controller('calendar-feed')
export class CalendarFeedController {
  constructor(
    private readonly getUseCase: GetCalendarFeedUseCase,
    private readonly issueUseCase: IssueCalendarFeedUseCase,
    private readonly revokeUseCase: RevokeCalendarFeedUseCase,
    private readonly buildUseCase: BuildCalendarFeedUseCase,
    private readonly setVisibilityUseCase: SetCalendarVisibilityUseCase,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  async getStatus(@CurrentUser() user: JwtPayload): Promise<CalendarFeedStatus> {
    return await this.getUseCase.execute(user.sub, user.tenantUuid);
  }

  /** Crea el enlace del usuario; si ya tiene uno, lo devuelve sin cambiarlo. */
  @Post()
  @UseGuards(AuthGuard)
  async issue(@CurrentUser() user: JwtPayload): Promise<CalendarFeedStatus> {
    return await this.issueUseCase.execute(user.sub, user.tenantUuid);
  }

  @Delete()
  @UseGuards(AuthGuard)
  async revoke(@CurrentUser() user: JwtPayload): Promise<{ success: boolean }> {
    return await this.revokeUseCase.execute(user.sub, user.tenantUuid);
  }

  /** Quita un calendario (queda vacío en el teléfono) o lo vuelve a mostrar. */
  @Patch('calendars')
  @UseGuards(AuthGuard)
  async setVisibility(
    @Body(new ZodValidationPipe(SetCalendarVisibilitySchema)) dto: SetCalendarVisibilityDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CalendarFeedStatus> {
    return await this.setVisibilityUseCase.execute(user.sub, user.tenantUuid, dto);
  }

  /** Público: el calendario del enlace, opcionalmente de una sede (y un tipo) y con su color. */
  @Get(':file')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async feed(
    @Param('file') file: string,
    @Query('branch') branch?: string,
    @Query('type') type?: string,
    @Query('color') color?: string,
  ): Promise<string> {
    return await this.buildUseCase.execute(file.replace(ICS_EXTENSION, ''), {
      branchUuid: branch && UUID.test(branch) ? branch : undefined,
      typeUuid: type && UUID.test(type) ? type : undefined,
      color: color && HEX_COLOR.test(color) ? color : undefined,
    });
  }
}
