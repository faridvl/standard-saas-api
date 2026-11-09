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

// Defensa adicional por patrones, no un sanitizador: el SVG también se sirve como attachment.
// El prefijo de namespace (`x:script`) también cuenta como etiqueta activa.
const SVG_ACTIVE_CONTENT = [
  /<\s*([\w-]+:)?(script|foreignObject|iframe|embed|object|audio|video|handler|listener)\b/i,
  /[\s"'/]([\w-]+:)?on[a-z]+\s*=/i,
  /<!ENTITY/i,
  /<!DOCTYPE/i,
];
const SVG_HREF_VALUE = /(?:[\w-]+:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const SVG_HREF_ENCODED = /&(#|colon;|tab;|newline;)/i;
const SVG_DANGEROUS_SCHEME = /(javascript|vbscript|data):/i;
// eslint-disable-next-line no-control-regex
const SVG_BLANKS_AND_CONTROLS = /[\s\u0000-\u001f\u007f]/g;

const decodeNumericEntities = (content: string): string =>
  content.replace(/&#(x[0-9a-f]+|\d+);?/gi, (match, code: string) => {
    const point = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : parseInt(code, 10);
    return Number.isFinite(point) && point <= 0x10ffff ? String.fromCodePoint(point) : match;
  });

const hasEncodedHref = (content: string): boolean =>
  [...content.matchAll(SVG_HREF_VALUE)].some((match) =>
    SVG_HREF_ENCODED.test(match[1] ?? match[2] ?? match[3] ?? ''),
  );

const hasDangerousScheme = (content: string): boolean =>
  SVG_DANGEROUS_SCHEME.test(decodeNumericEntities(content).replace(SVG_BLANKS_AND_CONTROLS, ''));

const hasActiveContent = (content: string): boolean =>
  SVG_ACTIVE_CONTENT.some((pattern) => pattern.test(content)) ||
  hasEncodedHref(content) ||
  hasDangerousScheme(content);

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
    if (hasActiveContent(content)) {
      throw new BadRequestException('El SVG no puede contener scripts ni contenido activo.');
    }
    return { mimeType: 'image/svg+xml', extension: 'svg' };
  }
  return null;
}

/** El SVG se sirve como descarga: abrir su URL directa no ejecuta nada en el origen del bucket. */
export const clinicLogoDisposition = (format: ClinicLogoFormat): string | undefined =>
  format.extension === 'svg' ? 'attachment' : undefined;

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
