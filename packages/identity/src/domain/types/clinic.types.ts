export type ClinicDomain = {
  businessName: string;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export type ClinicContactData = {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

/** Roles que administran Configuración (la clínica incluida). */
export const CLINIC_SETTINGS_ROLES: readonly string[] = ['OWNER', 'ADMIN'];
