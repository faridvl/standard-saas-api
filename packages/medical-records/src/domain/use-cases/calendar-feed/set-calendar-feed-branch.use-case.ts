import { Injectable, NotFoundException } from '@nestjs/common';
import { CalendarFeedStorage } from '@medical-records/infrastructure/adapters/calendarFeedRepository/calendar-feed.storage';
import { CalendarFeedStatus, toCalendarFeedStatus } from './get-calendar-feed.use-case';

/**
 * Quita o vuelve a agregar una sede del calendario del usuario. El servidor no
 * puede borrar una suscripción del teléfono: lo que hace es publicar vacío el
 * calendario de esa sede, que queda en el iPhone sin citas.
 */
@Injectable()
export class SetCalendarFeedBranchUseCase {
  constructor(private readonly storage: CalendarFeedStorage) {}

  async execute(
    userUuid: string,
    tenantUuid: string,
    branchUuid: string,
    isRemoved: boolean,
  ): Promise<CalendarFeedStatus> {
    const [feed, branchName] = await Promise.all([
      this.storage.findByUser(userUuid, tenantUuid),
      this.storage.findBranchName(branchUuid, tenantUuid),
    ]);
    if (!feed) throw new NotFoundException('No tienes un calendario conectado');
    if (!branchName) throw new NotFoundException(`Sede con UUID ${branchUuid} no encontrada`);

    const others = feed.removedBranchUuids.filter((uuid) => uuid !== branchUuid);
    const removedBranchUuids = isRemoved ? [...others, branchUuid] : others;

    return toCalendarFeedStatus(
      await this.storage.updateRemovedBranches(userUuid, removedBranchUuids),
    );
  }
}
