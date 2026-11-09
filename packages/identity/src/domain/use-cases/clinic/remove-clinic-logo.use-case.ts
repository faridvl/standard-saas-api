import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { StorageService } from '@project/core';
import { TenantStorage } from '../../../infrastructure/adapters/tenant.storage';
import { ClinicDomain } from '../../types/clinic.types';
import { toClinicDomain } from '../../utils/clinic-logo.util';
import { assertCanManageClinic } from '../../utils/clinic-permissions.util';

@Injectable()
export class RemoveClinicLogoUseCase {
  private readonly logger = new Logger(RemoveClinicLogoUseCase.name);

  constructor(
    private readonly tenantStorage: TenantStorage,
    private readonly storageService: StorageService,
  ) {}

  async execute(tenantUuid: string, role: string | null | undefined): Promise<ClinicDomain> {
    assertCanManageClinic(role);

    const current = await this.tenantStorage.findClinicByUuid(tenantUuid);
    if (!current) throw new NotFoundException('Clínica no encontrada');

    const updated = await this.tenantStorage.setClinicLogoKey(tenantUuid, null);
    if (!updated) throw new NotFoundException('Clínica no encontrada');

    if (current.logoKey) {
      try {
        await this.storageService.deleteObject(current.logoKey);
      } catch (error) {
        this.logger.warn(`No se pudo borrar el logo ${current.logoKey}: ${String(error)}`);
      }
    }
    return toClinicDomain(updated, (value) => this.storageService.getPublicUrl(value));
  }
}
