import { Injectable, NotFoundException } from '@nestjs/common';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';

@Injectable()
export class DeleteUserUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  async execute(uuid: string, tenantUuid: string): Promise<{ success: boolean }> {
    const existing = await this.userStorage.findByUuidAndTenant(uuid, tenantUuid);
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    await this.userStorage.softDelete(uuid);
    return { success: true };
  }
}
