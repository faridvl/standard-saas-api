import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserStorage, UpdateUserParams } from '../../../infrastructure/adapters/user.storage';
import {
  OWN_MEDIA_ONLY_MESSAGE,
  assertCanAdministerUsers,
  assertTargetNotOtherOwner,
  resolveActiveActor,
} from '../../policies/user-admin.policy';
import { UserActor, UserDomain } from '../../types/user.types';

export type UpdateUserData = UpdateUserParams;

@Injectable()
export class UpdateUserUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  /** La firma y la foto solo las cambia su dueño: se llama antes de subir el archivo al bucket. */
  async assertCanChangeOwnMedia(uuid: string, actor: UserActor): Promise<void> {
    if (actor.uuid !== uuid) throw new ForbiddenException(OWN_MEDIA_ONLY_MESSAGE);
    await resolveActiveActor(this.userStorage, actor);
  }

  async execute(uuid: string, actor: UserActor, data: UpdateUserData): Promise<UserDomain> {
    const current = await resolveActiveActor(this.userStorage, actor);
    const isSelf = actor.uuid === uuid;

    if ((data.signatureUrl !== undefined || data.avatarUrl !== undefined) && !isSelf) {
      throw new ForbiddenException(OWN_MEDIA_ONLY_MESSAGE);
    }

    if (data.role !== undefined) {
      assertCanAdministerUsers(current);
      if (isSelf) throw new BadRequestException('No puedes cambiar tu propio rol');
    }

    if (!isSelf) assertCanAdministerUsers(current);

    const existing = isSelf
      ? current
      : await this.userStorage.findByUuidAndTenant(uuid, actor.tenantUuid);
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    assertTargetNotOtherOwner(current, existing);

    return await this.userStorage.update(uuid, data);
  }
}
