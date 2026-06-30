import { z } from 'zod';

export const CreateProductUnitSchema = z.object({
  serialNumber: z.string().min(1, 'Número de serie requerido'),
  purchaseDate: z.coerce.date().optional(),
  warrantyUntil: z.coerce.date().optional(),
  photoUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export const CreateProductUnitsBulkSchema = z.object({
  units: z.array(CreateProductUnitSchema).min(1, 'Debe incluir al menos una unidad'),
});

export const UpdateProductUnitSchema = z.object({
  status: z.enum(['AVAILABLE', 'DAMAGED', 'RETIRED']).optional(),
  warrantyUntil: z.coerce.date().optional(),
  photoUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export type CreateProductUnitDto = z.infer<typeof CreateProductUnitSchema>;
export type CreateProductUnitsBulkDto = z.infer<typeof CreateProductUnitsBulkSchema>;
export type UpdateProductUnitDto = z.infer<typeof UpdateProductUnitSchema>;
