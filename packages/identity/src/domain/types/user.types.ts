export type CreateUserPersistence = {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  tenantId: number;
  tenantUUID: string;
  specialty?: string | null;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
};

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  STAFF = 'STAFF',
  USER = 'USER',
  MEDICO = 'MEDICO',
}

/** Roles que se pueden asignar hoy; USER y MEDICO quedan solo por compatibilidad con datos viejos. */
export const ASSIGNABLE_USER_ROLES = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.DOCTOR,
  UserRole.STAFF,
] as const;

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
  specialty?: string | null;
  avatarUrl?: string | null;
  signatureUrl?: string | null;
  phoneNumber?: string | null;
  status: UserStatus;
  createdAt: Date;
};
