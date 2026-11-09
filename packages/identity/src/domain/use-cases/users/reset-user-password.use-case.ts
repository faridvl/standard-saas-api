import * as bcrypt from 'bcrypt';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { assertCanAdministerUsers } from '../../policies/user-admin.policy';
import { UserActor } from '../../types/user.types';

@Injectable()
export class ResetUserPasswordUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  async execute(uuid: string, password: string, actor: UserActor): Promise<void> {
    assertCanAdministerUsers(actor.role);

    const existing = await this.userStorage.findByUuidAndTenant(uuid, actor.tenantUuid);
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    const salt = await bcrypt.genSalt(10);
    await this.userStorage.updatePassword(uuid, await bcrypt.hash(password, salt));
  }
}
