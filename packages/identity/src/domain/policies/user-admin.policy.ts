import { ForbiddenException } from '@nestjs/common';
import { UserActor, UserRole } from '../types/user.types';

/** Roles que crean, cambian de rol, activan, desactivan y ponen contraseña a los usuarios de la clínica. */
export const USER_ADMIN_ROLES: readonly string[] = [UserRole.OWNER];

export function canAdministerUsers(role: string | null | undefined): boolean {
  return !!role && USER_ADMIN_ROLES.includes(role);
}

export function assertCanAdministerUsers(role: string | null | undefined): void {
  if (!canAdministerUsers(role)) {
    throw new ForbiddenException('Solo el propietario de la clínica puede administrar usuarios');
  }
}

/** Cada usuario edita su propio perfil; sobre otro usuario solo lo hace quien administra usuarios. */
export function assertCanEditUser(actor: UserActor, targetUuid: string): void {
  if (actor.uuid !== targetUuid) {
    assertCanAdministerUsers(actor.role);
  }
}
