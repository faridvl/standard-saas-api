// packages/identity/src/domain/use-cases/get-me.use-case.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { TenantStorage } from '../../../infrastructure/adapters/tenant.storage';

@Injectable()
export class GetMeUseCase {
  constructor(
    private readonly userStorage: UserStorage,
    private readonly tenantStorage: TenantStorage,
  ) {}

  async execute(params: { userUuid: string; tenantUuid: string }) {
    const user = await this.userStorage.findByUuid(params.userUuid);
    if (!user) throw new NotFoundException('User not found');

    const tenant = await this.tenantStorage.findByUuid(params.tenantUuid);
    if (!tenant) throw new NotFoundException('Tenant not found');

    return {
      user,
      tenant,
    };
  }
}
