import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { assertCanAdministerUsers } from '../../policies/user-admin.policy';
import { UserActor, UserDomain, UserStatus } from '../../types/user.types';
import { assertNotLastActiveOwner } from '../../utils/last-owner.util';

@Injectable()
export class SetUserStatusUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  async execute(uuid: string, status: UserStatus, actor: UserActor): Promise<UserDomain> {
    assertCanAdministerUsers(actor.role);

    if (status === UserStatus.INACTIVE && actor.uuid === uuid) {
      throw new BadRequestException('No puedes desactivar tu propio usuario');
    }

    const existing = await this.userStorage.findByUuidAndTenant(uuid, actor.tenantUuid);
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    if (status === UserStatus.INACTIVE) {
      await assertNotLastActiveOwner(this.userStorage, existing, actor.tenantUuid);
    }

    await this.userStorage.updateStatus(uuid, status);
    return { ...existing, status };
  }
}
