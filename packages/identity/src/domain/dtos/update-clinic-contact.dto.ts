import { z } from 'zod';

export const CLINIC_ADDRESS_MAX_LENGTH = 300;
export const CLINIC_EMAIL_MAX_LENGTH = 254;
export const CLINIC_PHONE_MAX_LENGTH = 20;
export const CLINIC_PHONE_MIN_DIGITS = 8;
export const CLINIC_PHONE_MAX_DIGITS = 15;

// Mismo formato que los teléfonos de pacientes: `+506 8888-7777`, `8888-7777` o `+13055551234`.
const PHONE_ALLOWED_CHARS = /^\+?[\d\s\-()]+$/;

const emptyToNull = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const phoneSchema = z
  .string()
  .trim()
  .max(CLINIC_PHONE_MAX_LENGTH, `El teléfono admite hasta ${CLINIC_PHONE_MAX_LENGTH} caracteres`)
  .refine((value) => PHONE_ALLOWED_CHARS.test(value), 'El teléfono tiene caracteres no válidos')
  .refine((value) => {
    const digits = value.replace(/\D/g, '').length;
    return digits >= CLINIC_PHONE_MIN_DIGITS && digits <= CLINIC_PHONE_MAX_DIGITS;
  }, `El teléfono debe tener entre ${CLINIC_PHONE_MIN_DIGITS} y ${CLINIC_PHONE_MAX_DIGITS} dígitos`);

const emailSchema = z.string().trim().max(CLINIC_EMAIL_MAX_LENGTH).email('El correo no es válido');

const addressSchema = z
  .string()
  .trim()
  .max(
    CLINIC_ADDRESS_MAX_LENGTH,
    `La dirección admite hasta ${CLINIC_ADDRESS_MAX_LENGTH} caracteres`,
  );

// Cadena vacía = null. Los campos que no son estos tres (`businessName`, `logoUrl`...) se
// descartan al parsear: este endpoint nunca los guarda.
export const UpdateClinicContactSchema = z.object({
  phone: z.preprocess(emptyToNull, phoneSchema.nullable().optional()),
  email: z.preprocess(emptyToNull, emailSchema.nullable().optional()),
  address: z.preprocess(emptyToNull, addressSchema.nullable().optional()),
});

export type UpdateClinicContactDto = z.infer<typeof UpdateClinicContactSchema>;
