/** Nivel de acceso, acumulativo: RECEPTION < ADMIN < OWNER. Vive en la columna `User.role`. */
export enum UserRole {
  RECEPTION = 'RECEPTION',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

/** Niveles que puede asignar Administración; OWNER lo da solo un OWNER. */
export const ADMIN_ASSIGNABLE_ROLES = [UserRole.RECEPTION, UserRole.ADMIN] as const;
export const ASSIGNABLE_USER_ROLES = [UserRole.RECEPTION, UserRole.ADMIN, UserRole.OWNER] as const;

/** Catálogo fijo de la plataforma; los nombres visibles los pone el front. */
export enum Specialty {
  AUDIOLOGY = 'AUDIOLOGY',
  ENT = 'ENT',
  SPEECH_THERAPY = 'SPEECH_THERAPY',
  GENERAL_MEDICINE = 'GENERAL_MEDICINE',
}

export enum ProfessionalTitle {
  LIC = 'LIC',
  LICDA = 'LICDA',
  MSC = 'MSC',
  DR = 'DR',
  DRA = 'DRA',
}

export enum UserAuditField {
  ROLE = 'ROLE',
  ATTENDS_PATIENTS = 'ATTENDS_PATIENTS',
  SPECIALTIES = 'SPECIALTIES',
  PASSWORD = 'PASSWORD',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum UserStatusFilter {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ALL = 'ALL',
}

/** Quien hace la petición, tal como sale de su JWT. */
export type UserActor = {
  uuid: string;
  role?: string | null;
  tenantId: number;
  tenantUuid: string;
};

export type UserDomain = {
  uuid: string;
  email: string;
  fullName: string;
  role?: UserRole | null;
  tenantId: number;
  tenantUUID?: string | null;
  attendsPatients: boolean;
  specialties: Specialty[];
  professionalTitle?: ProfessionalTitle | null;
  licenseNumber?: string | null;
  avatarUrl?: string | null;
  signatureUrl?: string | null;
  phoneNumber?: string | null;
  status: UserStatus;
  createdAt: Date;
};

export type UserAuditEntry = {
  uuid: string;
  actorUuid: string;
  actorName: string;
  targetUuid: string;
  targetName: string;
  field: UserAuditField;
  before: string | null;
  after: string | null;
  createdAt: Date;
};

/** Cambio por registrar; la fecha, el uuid y el usuario afectado los completa el storage. */
export type UserAuditChange = {
  actorUuid: string;
  actorName: string;
  field: UserAuditField;
  before: string | null;
  after: string | null;
};

export const LAST_OWNER_MESSAGE = 'La clínica no puede quedar sin un propietario activo';
