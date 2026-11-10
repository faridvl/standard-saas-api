import { z } from 'zod';
import {
  EQUIPMENT_BRAND_MAX_LENGTH,
  EQUIPMENT_MODEL_MAX_LENGTH,
} from '@medical-records/domain/utils/equipment.util';

const brandSchema = z
  .string()
  .trim()
  .min(1, { message: 'La marca es requerida' })
  .max(EQUIPMENT_BRAND_MAX_LENGTH, {
    message: `La marca admite hasta ${EQUIPMENT_BRAND_MAX_LENGTH} caracteres`,
  });
const modelSchema = z
  .string()
  .trim()
  .min(1, { message: 'El modelo es requerido' })
  .max(EQUIPMENT_MODEL_MAX_LENGTH, {
    message: `El modelo admite hasta ${EQUIPMENT_MODEL_MAX_LENGTH} caracteres`,
  });

export const CreateEquipmentSchema = z.object({
  brand: brandSchema,
  model: modelSchema,
});

export type CreateEquipmentDto = z.infer<typeof CreateEquipmentSchema>;

export const UpdateEquipmentSchema = z
  .object({
    brand: brandSchema.optional(),
    model: modelSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((dto) => Object.values(dto).some((value) => value !== undefined), {
    message: 'Indica al menos un campo para actualizar',
  });

export type UpdateEquipmentDto = z.infer<typeof UpdateEquipmentSchema>;
