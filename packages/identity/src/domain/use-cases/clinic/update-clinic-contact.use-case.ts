import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from '@project/core';
import { TenantStorage } from '../../../infrastructure/adapters/tenant.storage';
import { ClinicContactData, ClinicDomain } from '../../types/clinic.types';
import { toClinicDomain } from '../../utils/clinic-logo.util';
import { assertCanManageClinic } from '../../utils/clinic-permissions.util';

@Injectable()
export class UpdateClinicContactUseCase {
  constructor(
    private readonly tenantStorage: TenantStorage,
    private readonly storageService: StorageService,
  ) {}

  /** Solo guarda nombre, teléfono, correo y dirección: el resto del body nunca llega al storage. */
  async execute(
    tenantUuid: string,
    role: string | null | undefined,
    data: ClinicContactData,
  ): Promise<ClinicDomain> {
    assertCanManageClinic(role);

    const contact: ClinicContactData = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.address !== undefined && { address: data.address }),
    };

    const clinic = await this.tenantStorage.updateClinicContact(tenantUuid, contact);
    if (!clinic) throw new NotFoundException('Clínica no encontrada');
    return toClinicDomain(clinic, (key) => this.storageService.getPublicUrl(key));
  }
}
