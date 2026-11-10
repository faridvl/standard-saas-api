import * as bcrypt from 'bcrypt';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { assertCanManageTarget, resolveUserAdmin } from '../../policies/user-admin.policy';
import { UserActor, UserAuditField } from '../../types/user.types';

@Injectable()
export class ResetUserPasswordUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  async execute(uuid: string, password: string, actor: UserActor): Promise<void> {
    const admin = await resolveUserAdmin(this.userStorage, actor);

    const existing = await this.userStorage.findByUuidAndTenant(uuid, actor.tenantUuid);
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    assertCanManageTarget(admin, existing);

    const salt = await bcrypt.genSalt(10);
    // La bitácora deja constancia del reseteo igual que del cambio propio: nunca un valor de contraseña.
    await this.userStorage.updatePassword(uuid, await bcrypt.hash(password, salt), [
      {
        actorUuid: admin.uuid,
        actorName: admin.fullName,
        field: UserAuditField.PASSWORD,
        before: null,
        after: null,
      },
    ]);
  }
}
