import { Injectable, NotFoundException } from '@nestjs/common';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { UserDomain } from '../../types/user.types';

@Injectable()
export class FindOneUserUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  async execute(uuid: string, tenantUuid: string): Promise<UserDomain> {
    const user = await this.userStorage.findByUuidAndTenant(uuid, tenantUuid);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
}
