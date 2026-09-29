import { z } from 'zod';

export const UpdatePatientSchema = z.object({
  firstName: z.string().min(2, 'El nombre es muy corto').optional(),
  lastName: z.string().min(2, 'El apellido es muy corto').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z.literal('').optional().or(z.string().email()),
  gender: z.string().optional(),
  bloodType: z.string().optional(),
  linkedProductUuid: z.string().uuid().nullable().optional(),
  documentId: z.string().optional(),
  occupation: z.string().optional(),
  branchUuid: z.string().uuid().nullable().optional(),
  // Mes tentativo de la próxima cita ("YYYY-MM"). null lo limpia: es lo que
  // manda el front cuando el paciente confirma y se agenda la cita real.
  tentativeAppointmentMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, { message: 'Mes inválido (YYYY-MM)' })
    .nullable()
    .optional(),
  // De qué sería esa próxima cita tentativa. Se limpia junto con el mes.
  tentativeAppointmentTypeUuid: z
    .string()
    .uuid({ message: 'ID de tipo de cita inválido' })
    .nullable()
    .optional(),
});

export type UpdatePatientDto = z.infer<typeof UpdatePatientSchema>;
