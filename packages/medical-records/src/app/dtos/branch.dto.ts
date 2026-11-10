import { z } from 'zod';
import { BranchColor } from '@prisma/client';
import {
  BRANCH_ADDRESS_MAX_LENGTH,
  BRANCH_NAME_MAX_LENGTH,
  BRANCH_PHONE_MAX_LENGTH,
} from '@medical-records/domain/utils/branch-name.util';

const nameSchema = z
  .string()
  .trim()
  .min(1, { message: 'El nombre es requerido' })
  .max(BRANCH_NAME_MAX_LENGTH, {
    message: `El nombre admite hasta ${BRANCH_NAME_MAX_LENGTH} caracteres`,
  });
const phoneSchema = z
  .string()
  .trim()
  .max(BRANCH_PHONE_MAX_LENGTH, {
    message: `El teléfono admite hasta ${BRANCH_PHONE_MAX_LENGTH} caracteres`,
  })
  .nullish();
const addressSchema = z
  .string()
  .trim()
  .max(BRANCH_ADDRESS_MAX_LENGTH, {
    message: `La dirección admite hasta ${BRANCH_ADDRESS_MAX_LENGTH} caracteres`,
  })
  .nullish();
const colorSchema = z.nativeEnum(BranchColor, { message: 'Color de sede inválido' });

export const CreateBranchSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  address: addressSchema,
  color: colorSchema,
});

export type CreateBranchDto = z.infer<typeof CreateBranchSchema>;

export const UpdateBranchSchema = z
  .object({
    name: nameSchema.optional(),
    phone: phoneSchema,
    address: addressSchema,
    color: colorSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((dto) => Object.values(dto).some((value) => value !== undefined), {
    message: 'Indica al menos un campo para actualizar',
  });

export type UpdateBranchDto = z.infer<typeof UpdateBranchSchema>;
