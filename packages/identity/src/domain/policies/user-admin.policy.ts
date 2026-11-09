import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserStorage } from '../../infrastructure/adapters/user.storage';
import {
  LAST_OWNER_MESSAGE,
  UserActor,
  UserDomain,
  UserRole,
  UserStatus,
} from '../types/user.types';

export const ACTOR_INACTIVE_MESSAGE = 'Tu usuario ya no está activo en esta clínica';
export const NOT_USER_ADMIN_MESSAGE =
  'Solo Administración o el propietario pueden administrar usuarios';
export const OWNER_ONLY_MESSAGE =
  'Solo el propietario puede cambiar el acceso clínico, las especialidades o el nivel de propietario';
export const OWNER_UNTOUCHABLE_MESSAGE = 'Solo un propietario puede administrar a otro propietario';
export const OWN_MEDIA_ONLY_MESSAGE = 'La firma y la foto solo las cambia su dueño';
export const OWN_PROFESSIONAL_ONLY_MESSAGE =
  'El título y el número de colegiado solo los edita cada profesional en su perfil';
export { LAST_OWNER_MESSAGE };

/** Niveles que listan, crean, activan, desactivan y ponen contraseña a los usuarios de la clínica. */
const USER_ADMIN_LEVELS: readonly string[] = [UserRole.ADMIN, UserRole.OWNER];

export function canAdministerUsers(role: string | null | undefined): boolean {
  return !!role && USER_ADMIN_LEVELS.includes(role);
}

export function isOwner(user: UserDomain): boolean {
  return user.role === UserRole.OWNER;
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

/** Actor releído de la base, activo y con nivel de Administración o Propietario. */
export async function resolveUserAdmin(
  storage: UserStorage,
  actor: UserActor,
): Promise<UserDomain> {
  const current = await resolveActiveActor(storage, actor);
  assertCanAdministerUsers(current);
  return current;
}

export function assertIsOwner(current: UserDomain): void {
  if (!isOwner(current)) throw new ForbiddenException(OWNER_ONLY_MESSAGE);
}

/** Administración no toca a un propietario; entre propietarios sí se administran. */
export function assertCanManageTarget(admin: UserDomain, target: UserDomain): void {
  if (isOwner(target) && !isOwner(admin)) {
    throw new ForbiddenException(OWNER_UNTOUCHABLE_MESSAGE);
  }
}

/** Chequeo rápido previo; la garantía atómica la da `UserStorage` con `requireOtherOwner`. */
/** Falla si, sin `excludingUuid`, no queda ningún propietario activo en la clínica. */
export async function assertTenantKeepsOwner(
  storage: UserStorage,
  tenantUuid: string,
  excludingUuid: string,
): Promise<void> {
  const remaining = await storage.countActiveOwners(tenantUuid, excludingUuid);
  if (remaining < 1) throw new BadRequestException(LAST_OWNER_MESSAGE);
}
