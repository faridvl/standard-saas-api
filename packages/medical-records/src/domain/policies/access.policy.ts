/** Nivel del usuario en la clínica (`role` del token). Los roles viejos no son un nivel. */
export enum AccessLevel {
  RECEPTION = 'RECEPTION',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

export enum Specialty {
  AUDIOLOGY = 'AUDIOLOGY',
  ENT = 'ENT',
  SPEECH_THERAPY = 'SPEECH_THERAPY',
  GENERAL_MEDICINE = 'GENERAL_MEDICINE',
}

/**
 * Lo que exige una ruta. Cada requisito es independiente: el nivel y atender pacientes
 * no se sustituyen entre sí.
 */
export interface AccessRequirement {
  minLevel?: AccessLevel;
  /** Datos clínicos del paciente: exige `attendsPatients`, sin importar el nivel. */
  clinical?: boolean;
  /** Además de `clinical`, una especialidad (p. ej. crear pruebas de audiología). */
  specialty?: Specialty;
}

export interface AccessSubject {
  role?: string | null;
  attendsPatients?: boolean;
  specialties?: string[];
}

const LEVEL_RANK: Record<AccessLevel, number> = {
  [AccessLevel.RECEPTION]: 0,
  [AccessLevel.ADMIN]: 1,
  [AccessLevel.OWNER]: 2,
};

const levelRank = (role: string | null | undefined): number | null =>
  role && Object.prototype.hasOwnProperty.call(LEVEL_RANK, role)
    ? LEVEL_RANK[role as AccessLevel]
    : null;

/**
 * Token emitido antes del modelo de niveles: rol viejo (DOCTOR, STAFF...) o sin el claim
 * `attendsPatients`. No es un permiso insuficiente sino una sesión vieja que hay que renovar.
 */
export function isLegacyToken(subject: AccessSubject): boolean {
  return levelRank(subject.role) === null || typeof subject.attendsPatients !== 'boolean';
}

/** Un token sin nivel válido (roles viejos como DOCTOR o STAFF) no entra a ninguna ruta. */
export function canAccess(subject: AccessSubject, requirement: AccessRequirement): boolean {
  const rank = levelRank(subject.role);
  if (rank === null) return false;
  if (requirement.minLevel && rank < LEVEL_RANK[requirement.minLevel]) return false;
  if ((requirement.clinical || requirement.specialty) && subject.attendsPatients !== true) {
    return false;
  }
  if (requirement.specialty && !subject.specialties?.includes(requirement.specialty)) {
    return false;
  }
  return true;
}
