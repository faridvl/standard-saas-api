import { z } from 'zod';

export const CreateAppointmentTypeSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido' }),
  duration: z.number().int().positive().optional().nullable(),
  color: z.string().optional().nullable(),
  speciality: z.string().optional().nullable(),
});

export type CreateAppointmentTypeDto = z.infer<typeof CreateAppointmentTypeSchema>;
