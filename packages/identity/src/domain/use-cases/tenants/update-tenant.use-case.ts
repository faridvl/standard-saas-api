import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantStorage } from '../../../infrastructure/adapters/tenant.storage';
import { TenantDomain } from '../../types/auth.types';

export type UpdateTenantData = {
  businessName?: string;
  businessType?: string;
  logoUrl?: string | null;
};

@Injectable()
export class UpdateTenantUseCase {
  constructor(private readonly tenantStorage: TenantStorage) {}

  async execute(
    uuid: string,
    requesterTenantUuid: string,
    data: UpdateTenantData,
  ): Promise<TenantDomain> {
    if (uuid !== requesterTenantUuid) {
      throw new NotFoundException('Tenant no encontrado');
    }

    const existing = await this.tenantStorage.findByUuid(uuid);
    if (!existing) throw new NotFoundException('Tenant no encontrado');

    return await this.tenantStorage.update(uuid, data);
  }
}
