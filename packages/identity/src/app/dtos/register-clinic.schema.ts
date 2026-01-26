import { z } from 'zod';

export const RegisterClinicSchema = z.object({
  email: z.string().email('INVALID_EMAIL_FORMAT'),
  businessName: z.string().min(3, 'BUSINESS_NAME_TOO_SHORT'),
});

// Esto crea el tipo TypeScript automáticamente sin repetir código
export type RegisterClinicDto = z.infer<typeof RegisterClinicSchema>;
