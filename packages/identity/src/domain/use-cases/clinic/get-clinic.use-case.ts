import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantStorage } from '../../../infrastructure/adapters/tenant.storage';
import { ClinicDomain } from '../../types/clinic.types';

@Injectable()
export class GetClinicUseCase {
  constructor(private readonly tenantStorage: TenantStorage) {}

  async execute(tenantUuid: string): Promise<ClinicDomain> {
    const clinic = await this.tenantStorage.findClinicByUuid(tenantUuid);
    if (!clinic) throw new NotFoundException('Clínica no encontrada');
    return clinic;
  }
}
