import { Injectable, NotFoundException } from '@nestjs/common';
import { CalendarFeedStorage } from '@medical-records/infrastructure/adapters/calendarFeedRepository/calendar-feed.storage';
import { SetCalendarVisibilityDto } from '@medical-records/app/dtos/calendar-feed.dto';
import { buildCalendarKey } from '@medical-records/domain/utils/calendar-key.util';
import { CalendarFeedStatus, toCalendarFeedStatus } from './get-calendar-feed.use-case';

/**
 * Quita un calendario (una sede, o una sede y un tipo) o lo vuelve a mostrar.
 * El servidor no puede borrar una suscripción del teléfono: lo que hace es
 * publicar ese calendario vacío, que queda en el iPhone sin citas.
 */
@Injectable()
export class SetCalendarVisibilityUseCase {
  constructor(private readonly storage: CalendarFeedStorage) {}

  async execute(
    userUuid: string,
    tenantUuid: string,
    dto: SetCalendarVisibilityDto,
  ): Promise<CalendarFeedStatus> {
    const [feed, branchName, typeName] = await Promise.all([
      this.storage.findByUser(userUuid, tenantUuid),
      this.storage.findBranchName(dto.branchUuid, tenantUuid),
      dto.typeUuid ? this.storage.findAppointmentTypeName(dto.typeUuid, tenantUuid) : null,
    ]);
    if (!feed) throw new NotFoundException('No tienes un calendario conectado');
    if (!branchName) throw new NotFoundException(`Sede con UUID ${dto.branchUuid} no encontrada`);
    if (dto.typeUuid && !typeName) {
      throw new NotFoundException(`Tipo de cita con UUID ${dto.typeUuid} no encontrado`);
    }

    const key = buildCalendarKey(dto.branchUuid, dto.typeUuid ?? undefined);
    const others = feed.removedCalendarKeys.filter((removedKey) => removedKey !== key);
    const removedCalendarKeys = dto.isRemoved ? [...others, key] : others;

    return toCalendarFeedStatus(
      await this.storage.updateRemovedCalendars(userUuid, removedCalendarKeys),
    );
  }
}
