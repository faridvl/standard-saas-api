import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, CurrentUser, JwtPayload } from '@project/core';
import {
  BuildCalendarFeedUseCase,
  CalendarFeedStatus,
  GetCalendarFeedUseCase,
  IssueCalendarFeedUseCase,
  RevokeCalendarFeedUseCase,
  SetCalendarFeedBranchUseCase,
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
    private readonly setBranchUseCase: SetCalendarFeedBranchUseCase,
  ) {}

  /** Quita una sede: su calendario en el teléfono queda vacío. */
  @Delete('branches/:branchUuid')
  @UseGuards(AuthGuard)
  async removeBranch(
    @Param('branchUuid') branchUuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<CalendarFeedStatus> {
    return await this.setBranch(branchUuid, user, true);
  }

  /** Vuelve a publicar las citas de una sede quitada. */
  @Put('branches/:branchUuid')
  @UseGuards(AuthGuard)
  async restoreBranch(
    @Param('branchUuid') branchUuid: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<CalendarFeedStatus> {
    return await this.setBranch(branchUuid, user, false);
  }

  private async setBranch(
    branchUuid: string,
    user: JwtPayload,
    isRemoved: boolean,
  ): Promise<CalendarFeedStatus> {
    if (!UUID.test(branchUuid)) throw new BadRequestException('UUID de sede inválido');
    return await this.setBranchUseCase.execute(user.sub, user.tenantUuid, branchUuid, isRemoved);
  }

  @Get()
  @UseGuards(AuthGuard)
  async getStatus(@CurrentUser() user: JwtPayload): Promise<CalendarFeedStatus> {
    return await this.getUseCase.execute(user.sub, user.tenantUuid);
  }

  /** Crea el enlace, o lo regenera (el anterior deja de servir). */
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

  /** Público: el calendario del enlace, opcionalmente de una sede y con su color. */
  @Get(':file')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async feed(
    @Param('file') file: string,
    @Query('branch') branch?: string,
    @Query('color') color?: string,
  ): Promise<string> {
    return await this.buildUseCase.execute(file.replace(ICS_EXTENSION, ''), {
      branchUuid: branch && UUID.test(branch) ? branch : undefined,
      color: color && HEX_COLOR.test(color) ? color : undefined,
    });
  }
}
