import * as bcrypt from 'bcrypt';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { UserActor, UserAuditField, UserStatus } from '../../types/user.types';

export const INVALID_CURRENT_PASSWORD_CODE = 'INVALID_CURRENT_PASSWORD';
export const SAME_PASSWORD_CODE = 'SAME_PASSWORD';
const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class ChangeOwnPasswordUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  async execute(actor: UserActor, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userStorage.findCredentialsByUuidAndTenant(
      actor.uuid,
      actor.tenantUuid,
    );
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new BadRequestException({
        message: 'La contraseña actual no es correcta',
        code: INVALID_CURRENT_PASSWORD_CODE,
      });
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      throw new BadRequestException({
        message: 'La contraseña nueva debe ser distinta de la actual',
        code: SAME_PASSWORD_CODE,
      });
    }

    const hashed = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    // La bitácora solo deja constancia del cambio: nunca un valor de contraseña.
    await this.userStorage.updatePassword(user.uuid, hashed, [
      {
        actorUuid: user.uuid,
        actorName: user.fullName,
        field: UserAuditField.PASSWORD,
        before: null,
        after: null,
      },
    ]);
  }
}
