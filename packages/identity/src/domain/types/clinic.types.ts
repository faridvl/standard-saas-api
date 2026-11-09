export type ClinicDomain = {
  businessName: string;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

/** Fila de la clínica tal como está guardada: `logoKey` es la key en el storage, `logoUrl` el valor heredado. */
export type ClinicRecord = {
  businessName: string;
  logoKey: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export type ClinicContactData = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

/** Roles que administran Configuración (la clínica incluida). */
export const CLINIC_SETTINGS_ROLES: readonly string[] = ['OWNER', 'ADMIN'];

export const CLINIC_LOGO_MAX_BYTES = 2 * 1024 * 1024;

export type ClinicLogoFormat = {
  mimeType: string;
  extension: string;
};

export const CLINIC_LOGO_ALLOWED_MIME_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
];
