import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from '@project/core';
import { TenantStorage } from '../../../infrastructure/adapters/tenant.storage';
import { ClinicDomain } from '../../types/clinic.types';
import { toClinicDomain } from '../../utils/clinic-logo.util';

@Injectable()
export class GetClinicUseCase {
  constructor(
    private readonly tenantStorage: TenantStorage,
    private readonly storageService: StorageService,
  ) {}

  async execute(tenantUuid: string): Promise<ClinicDomain> {
    const clinic = await this.tenantStorage.findClinicByUuid(tenantUuid);
    if (!clinic) throw new NotFoundException('Clínica no encontrada');
    return toClinicDomain(clinic, (key) => this.storageService.getPublicUrl(key));
  }
}
