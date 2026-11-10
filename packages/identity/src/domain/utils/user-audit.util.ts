import { UserAuditChange, UserAuditField, UserDomain } from '../types/user.types';

type Actor = Pick<UserDomain, 'uuid' | 'fullName'>;

/** Las especialidades se guardan ordenadas y separadas por coma para comparar antes y después. */
export const formatSpecialties = (specialties: readonly string[]): string | null =>
  specialties.length > 0 ? [...specialties].sort().join(',') : null;

export function sameSpecialties(a: readonly string[], b: readonly string[]): boolean {
  return formatSpecialties(a) === formatSpecialties(b);
}

export type AccessSnapshot = Pick<UserDomain, 'role' | 'attendsPatients' | 'specialties'>;

/** Compara el acceso antes y después y devuelve un registro por cada campo que cambió. */
export function diffAccess(
  actor: Actor,
  before: AccessSnapshot,
  after: AccessSnapshot,
): UserAuditChange[] {
  const base = { actorUuid: actor.uuid, actorName: actor.fullName };
  const changes: UserAuditChange[] = [];

  if (before.role !== after.role) {
    changes.push({
      ...base,
      field: UserAuditField.ROLE,
      before: before.role ?? null,
      after: after.role ?? null,
    });
  }
  if (before.attendsPatients !== after.attendsPatients) {
    changes.push({
      ...base,
      field: UserAuditField.ATTENDS_PATIENTS,
      before: String(before.attendsPatients),
      after: String(after.attendsPatients),
    });
  }
  if (!sameSpecialties(before.specialties, after.specialties)) {
    changes.push({
      ...base,
      field: UserAuditField.SPECIALTIES,
      before: formatSpecialties(before.specialties),
      after: formatSpecialties(after.specialties),
    });
  }
  return changes;
}
