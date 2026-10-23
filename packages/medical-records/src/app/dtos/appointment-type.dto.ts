import { z } from 'zod';

export const CreateAppointmentTypeSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido' }),
  duration: z.number().int().positive().optional().nullable(),
  color: z.string().optional().nullable(),
  speciality: z.string().optional().nullable(),
  isControl: z.boolean().optional(),
});

export type CreateAppointmentTypeDto = z.infer<typeof CreateAppointmentTypeSchema>;

export const UpdateAppointmentTypeSchema = CreateAppointmentTypeSchema.partial().refine(
  (dto) => Object.values(dto).some((value) => value !== undefined),
  { message: 'Indica al menos un campo para actualizar' },
);

export type UpdateAppointmentTypeDto = z.infer<typeof UpdateAppointmentTypeSchema>;
