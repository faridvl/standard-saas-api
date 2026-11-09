import { z } from 'zod';
import { ProfessionalTitle, Specialty } from '../types/user.types';

export const specialtiesSchema = z
  .array(z.nativeEnum(Specialty, { message: 'Especialidad fuera del catálogo' }))
  .transform((values) => [...new Set(values)]);

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
