export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  STAFF = 'STAFF',
  USER = 'USER',
  MEDICO = 'MEDICO',
}

export type UserDomain = {
  uuid: string;
  email: string;
  fullName: string;
  role?: UserRole | null;
  tenantId: number;
  tenantUUID?: string | null;
  specialty?: string | null;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  status: string;
  createdAt: Date;
};
