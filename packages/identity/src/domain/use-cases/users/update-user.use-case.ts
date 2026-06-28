import { Injectable, NotFoundException } from '@nestjs/common';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { UserDomain } from '../../types/user.types';

export type UpdateUserData = {
  fullName?: string;
  phoneNumber?: string;
  specialty?: string;
};

@Injectable()
export class UpdateUserUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  async execute(uuid: string, tenantUuid: string, data: UpdateUserData): Promise<UserDomain> {
    const existing = await this.userStorage.findByUuidAndTenant(uuid, tenantUuid);
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    return await this.userStorage.update(uuid, data);
  }
}
