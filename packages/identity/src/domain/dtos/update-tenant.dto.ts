import { z } from 'zod';

export const UpdateTenantSchema = z.object({
  businessName: z.string().min(1, 'El nombre del negocio es obligatorio').optional(),
  businessType: z.string().optional(),
});

export type UpdateTenantDto = z.infer<typeof UpdateTenantSchema>;
