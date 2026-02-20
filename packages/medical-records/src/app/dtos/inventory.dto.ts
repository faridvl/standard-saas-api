import { z } from 'zod';

export const ProductSchema = z.object({
  sku: z.string().min(3, 'SKU muy corto'),
  name: z.string().min(2, 'Nombre requerido'),
  model: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0),
  stock: z.object({
    current: z.number().default(0),
    min: z.number().default(5),
  }),
  cabysCode: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export type ProductDto = z.infer<typeof ProductSchema>;
