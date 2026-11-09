import { ForbiddenException } from '@nestjs/common';
import { CLINIC_SETTINGS_ROLES } from '../types/clinic.types';

export function assertCanManageClinic(role: string | null | undefined): void {
  if (!role || !CLINIC_SETTINGS_ROLES.includes(role)) {
    throw new ForbiddenException('No tienes permiso para modificar los datos de la clínica');
  }
}
