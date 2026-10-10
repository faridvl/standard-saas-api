const KEY_SEPARATOR = ':';

/** Clave de un calendario suscrito: la sede, o la sede y el tipo de cita. */
export function buildCalendarKey(branchUuid: string, typeUuid?: string): string {
  return typeUuid ? `${branchUuid}${KEY_SEPARATOR}${typeUuid}` : branchUuid;
}
