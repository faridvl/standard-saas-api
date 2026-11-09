import { BadRequestException } from '@nestjs/common';
import { ClinicDomain, ClinicLogoFormat, ClinicRecord } from '../types/clinic.types';

export const CLINIC_LOGO_FORMAT_ERROR =
  'Formato no permitido. El logo debe ser PNG, JPG, WEBP o SVG.';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const WEBP_TAG = [0x57, 0x45, 0x42, 0x50];
const WEBP_TAG_OFFSET = 8;
const SVG_HEAD_LENGTH = 2048;

// Un SVG abierto directo puede ejecutar scripts en el origen del bucket: se rechaza todo lo activo.
const SVG_ACTIVE_CONTENT = [
  /<\s*script/i,
  /<\s*foreignObject/i,
  /<\s*(iframe|embed|object|audio|video)\b/i,
  /\son[a-z]+\s*=/i,
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
  /<!ENTITY/i,
];

const startsWith = (buffer: Buffer, signature: number[], offset = 0): boolean =>
  signature.every((byte, index) => buffer[offset + index] === byte);

const isSvg = (buffer: Buffer): boolean => {
  const head = buffer.subarray(0, SVG_HEAD_LENGTH).toString('utf8');
  return /<svg[\s>]/i.test(head);
};

/** Detecta el formato por el contenido, no por el nombre ni el tipo que declara el cliente. */
export function detectClinicLogoFormat(buffer: Buffer): ClinicLogoFormat | null {
  if (startsWith(buffer, PNG_SIGNATURE)) return { mimeType: 'image/png', extension: 'png' };
  if (startsWith(buffer, JPEG_SIGNATURE)) return { mimeType: 'image/jpeg', extension: 'jpg' };
  if (startsWith(buffer, RIFF_SIGNATURE) && startsWith(buffer, WEBP_TAG, WEBP_TAG_OFFSET)) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  if (isSvg(buffer)) {
    const content = buffer.toString('utf8');
    if (SVG_ACTIVE_CONTENT.some((pattern) => pattern.test(content))) {
      throw new BadRequestException('El SVG no puede contener scripts ni contenido activo.');
    }
    return { mimeType: 'image/svg+xml', extension: 'svg' };
  }
  return null;
}

export const buildClinicLogoKey = (
  tenantUuid: string,
  extension: string,
  timestamp: number = Date.now(),
): string => `identity/${tenantUuid}/logos/logo-${timestamp}.${extension}`;

/** La key manda; si el tenant solo tiene la URL heredada, se devuelve esa. */
export const resolveLogoUrl = (
  logoKey: string | null | undefined,
  legacyLogoUrl: string | null | undefined,
  toPublicUrl: (key: string) => string,
): string | null => (logoKey ? toPublicUrl(logoKey) : (legacyLogoUrl ?? null));

export const toClinicDomain = (
  record: ClinicRecord,
  toPublicUrl: (key: string) => string,
): ClinicDomain => ({
  businessName: record.businessName,
  logoUrl: resolveLogoUrl(record.logoKey, record.logoUrl, toPublicUrl),
  phone: record.phone,
  email: record.email,
  address: record.address,
});
