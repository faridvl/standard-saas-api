import { Injectable, NotFoundException } from '@nestjs/common';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { UserActor, UserDomain, UserStatus } from '../../types/user.types';
import { canAdministerUsers } from '../../policies/user-admin.policy';

/** Lo que ve de otro usuario quien no administra usuarios: lo justo para mostrar un nombre. */
export type UserSummary = Pick<UserDomain, 'uuid' | 'fullName' | 'status'>;

@Injectable()
export class FindOneUserUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  /**
   * Administración y propietario ven la ficha completa, igual que en el listado; cada quien
   * ve la suya completa. Los demás niveles solo ven el resumen (el servicio de historias
   * lo usa para el nombre del autor, incluso si ya está inactivo).
   */
  async execute(uuid: string, actor: UserActor): Promise<UserDomain | UserSummary> {
    const user = await this.userStorage.findByUuidAndTenant(uuid, actor.tenantUuid);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (uuid === actor.uuid || (await this.canSeeFullProfile(actor))) return user;
    return { uuid: user.uuid, fullName: user.fullName, status: user.status };
  }

  private async canSeeFullProfile(actor: UserActor): Promise<boolean> {
    const current = await this.userStorage.findByUuidAndTenant(actor.uuid, actor.tenantUuid);
    return current?.status === UserStatus.ACTIVE && canAdministerUsers(current.role);
  }
}
