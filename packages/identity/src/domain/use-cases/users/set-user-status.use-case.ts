import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import {
  assertCanManageTarget,
  assertTenantKeepsOwner,
  resolveUserAdmin,
} from '../../policies/user-admin.policy';
import { UserActor, UserDomain, UserRole, UserStatus } from '../../types/user.types';

@Injectable()
export class SetUserStatusUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  async execute(uuid: string, status: UserStatus, actor: UserActor): Promise<UserDomain> {
    const admin = await resolveUserAdmin(this.userStorage, actor);

    if (admin.uuid === uuid) {
      throw new BadRequestException('No puedes cambiar tu propio estado');
    }

    const existing = await this.userStorage.findByUuidAndTenant(uuid, actor.tenantUuid);
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    assertCanManageTarget(admin, existing);

    const deactivatesOwner = status === UserStatus.INACTIVE && existing.role === UserRole.OWNER;
    if (deactivatesOwner) {
      await assertTenantKeepsOwner(this.userStorage, actor.tenantUuid, existing.uuid);
    }

    await this.userStorage.updateStatus(uuid, status, deactivatesOwner);
    return { ...existing, status };
  }
}
