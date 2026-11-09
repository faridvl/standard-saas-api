import { z } from 'zod';
import { ProfessionalTitle, Specialty } from '../types/user.types';

export const specialtiesSchema = z
  .array(z.nativeEnum(Specialty, { message: 'Especialidad fuera del catálogo' }))
  .transform((values) => [...new Set(values)]);

/**
 * Clientes viejos mandan `specialty` (una sola, texto) en vez de `specialties`. Si trae un código
 * del catálogo y no mandaron `specialties`, se toma como esa única especialidad; cualquier otro
 * valor se ignora (el esquema descarta la llave).
 */
export function acceptLegacySpecialty(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) return input;
  const { specialty, ...rest } = input as Record<string, unknown>;
  const isCatalogCode =
    typeof specialty === 'string' && (Object.values(Specialty) as string[]).includes(specialty);
  if (!isCatalogCode || 'specialties' in rest) return rest;
  return { ...rest, specialties: [specialty] };
}

export const professionalTitleSchema = z.nativeEnum(ProfessionalTitle, {
  message: 'Título fuera de la lista',
});

const LICENSE_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9./-]{1,19}$/;

export const licenseNumberSchema = z
  .string()
  .trim()
  .regex(LICENSE_NUMBER_PATTERN, 'Número de colegiado inválido (2 a 20 letras, números, - . /)');

export const ATTENDS_PATIENTS_NEEDS_SPECIALTY_MESSAGE =
  'Quien atiende pacientes necesita al menos una especialidad';
