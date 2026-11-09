import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { assertTargetNotOtherOwner, resolveUserAdmin } from '../../policies/user-admin.policy';
import { UserActor, UserDomain, UserStatus } from '../../types/user.types';

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

    assertTargetNotOtherOwner(admin, existing);

    await this.userStorage.updateStatus(uuid, status);
    return { ...existing, status };
  }
}
