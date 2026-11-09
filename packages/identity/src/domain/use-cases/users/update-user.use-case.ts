import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserStorage, UpdateUserParams } from '../../../infrastructure/adapters/user.storage';
import { assertCanAdministerUsers, assertCanEditUser } from '../../policies/user-admin.policy';
import { UserActor, UserDomain } from '../../types/user.types';
import { assertNotLastActiveOwner } from '../../utils/last-owner.util';

export type UpdateUserData = UpdateUserParams;

@Injectable()
export class UpdateUserUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  async execute(uuid: string, actor: UserActor, data: UpdateUserData): Promise<UserDomain> {
    assertCanEditUser(actor, uuid);

    if (data.role !== undefined) {
      assertCanAdministerUsers(actor.role);
      if (actor.uuid === uuid) throw new BadRequestException('No puedes cambiar tu propio rol');
    }

    const existing = await this.userStorage.findByUuidAndTenant(uuid, actor.tenantUuid);
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    if (data.role !== undefined && data.role !== existing.role) {
      await assertNotLastActiveOwner(this.userStorage, existing, actor.tenantUuid);
    }

    return await this.userStorage.update(uuid, data);
  }
}
