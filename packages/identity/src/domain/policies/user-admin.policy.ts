import { ForbiddenException } from '@nestjs/common';
import { UserStorage } from '../../infrastructure/adapters/user.storage';
import { UserActor, UserDomain, UserRole, UserStatus } from '../types/user.types';

/** Roles que crean, cambian de rol, activan, desactivan y ponen contraseña a los usuarios de la clínica. */
export const USER_ADMIN_ROLES: readonly string[] = [UserRole.OWNER];

export const ACTOR_INACTIVE_MESSAGE = 'Tu usuario ya no está activo en esta clínica';
export const NOT_USER_ADMIN_MESSAGE =
  'Solo el propietario de la clínica puede administrar usuarios';
export const OWNER_UNTOUCHABLE_MESSAGE = 'Un propietario no puede administrar a otro propietario';
export const OWN_MEDIA_ONLY_MESSAGE = 'La firma y la foto solo las cambia su dueño';

export function canAdministerUsers(role: string | null | undefined): boolean {
  return !!role && USER_ADMIN_ROLES.includes(role);
}

/** El token vale hasta una hora: el actor se relee en la base y debe seguir ACTIVE en su clínica. */
export async function resolveActiveActor(
  storage: UserStorage,
  actor: UserActor,
): Promise<UserDomain> {
  const current = await storage.findByUuidAndTenant(actor.uuid, actor.tenantUuid);
  if (!current || current.status !== UserStatus.ACTIVE) {
    throw new ForbiddenException(ACTOR_INACTIVE_MESSAGE);
  }
  return current;
}

export function assertCanAdministerUsers(current: UserDomain): void {
  if (!canAdministerUsers(current.role)) {
    throw new ForbiddenException(NOT_USER_ADMIN_MESSAGE);
  }
}

/** Actor releído de la base, activo y con permiso de administrar usuarios. */
export async function resolveUserAdmin(
  storage: UserStorage,
  actor: UserActor,
): Promise<UserDomain> {
  const current = await resolveActiveActor(storage, actor);
  assertCanAdministerUsers(current);
  return current;
}

/** Un propietario no administra a otro propietario; sobre sí mismo sí aplican las reglas propias de cada acción. */
export function assertTargetNotOtherOwner(admin: UserDomain, target: UserDomain): void {
  if (target.role === UserRole.OWNER && target.uuid !== admin.uuid) {
    throw new ForbiddenException(OWNER_UNTOUCHABLE_MESSAGE);
  }
}
