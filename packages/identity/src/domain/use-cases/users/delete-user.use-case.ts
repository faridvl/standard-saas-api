import { Injectable } from '@nestjs/common';
import { UserActor, UserStatus } from '../../types/user.types';
import { SetUserStatusUseCase } from './set-user-status.use-case';

/** No se borra: DELETE desactiva al usuario con las mismas reglas que `PATCH /users/:uuid/status`. */
@Injectable()
export class DeleteUserUseCase {
  constructor(private readonly setUserStatus: SetUserStatusUseCase) {}

  async execute(uuid: string, actor: UserActor): Promise<void> {
    await this.setUserStatus.execute(uuid, UserStatus.INACTIVE, actor);
  }
}
