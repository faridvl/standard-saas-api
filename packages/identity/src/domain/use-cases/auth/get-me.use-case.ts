// packages/identity/src/domain/use-cases/get-me.use-case.ts
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { StorageService } from '@project/core';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { TenantStorage } from '../../../infrastructure/adapters/tenant.storage';
import { UserDomain, UserStatus } from '../../types/user.types';
import { TenantDomain } from '../../types/auth.types';
import { resolveLogoUrl } from '../../utils/clinic-logo.util';

export type GetMeResult = {
  user: UserDomain;
  tenant: TenantDomain;
};

@Injectable()
export class GetMeUseCase {
  constructor(
    private readonly userStorage: UserStorage,
    private readonly tenantStorage: TenantStorage,
    private readonly storageService: StorageService,
  ) {}

  async execute(params: { userUuid: string; tenantUuid: string }): Promise<GetMeResult> {
    const user = await this.userStorage.findByUuid(params.userUuid);
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException('Credenciales inválidas');

    const tenant = await this.tenantStorage.findByUuid(params.tenantUuid);
    if (!tenant) throw new NotFoundException('Tenant not found');

    const { logoKey, ...publicTenant } = tenant;
    return {
      user,
      tenant: {
        ...publicTenant,
        logoUrl: resolveLogoUrl(logoKey, tenant.logoUrl, (key) =>
          this.storageService.getPublicUrl(key),
        ),
      },
    };
  }
}
