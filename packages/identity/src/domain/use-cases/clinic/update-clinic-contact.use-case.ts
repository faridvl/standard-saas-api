import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantStorage } from '../../../infrastructure/adapters/tenant.storage';
import { CLINIC_SETTINGS_ROLES, ClinicContactData, ClinicDomain } from '../../types/clinic.types';

@Injectable()
export class UpdateClinicContactUseCase {
  constructor(private readonly tenantStorage: TenantStorage) {}

  /** Solo guarda teléfono, correo y dirección: el resto del body nunca llega al storage. */
  async execute(
    tenantUuid: string,
    role: string | null | undefined,
    data: ClinicContactData,
  ): Promise<ClinicDomain> {
    if (!role || !CLINIC_SETTINGS_ROLES.includes(role)) {
      throw new ForbiddenException('No tienes permiso para modificar los datos de la clínica');
    }

    const contact: ClinicContactData = {
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.address !== undefined && { address: data.address }),
    };

    const clinic = await this.tenantStorage.updateClinicContact(tenantUuid, contact);
    if (!clinic) throw new NotFoundException('Clínica no encontrada');
    return clinic;
  }
}
