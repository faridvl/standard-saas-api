import { z } from 'zod';

export const ScheduleNextAppointmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Fecha inválida (YYYY-MM-DD)' }),
  branchUUID: z.string().uuid({ message: 'ID de sede inválido' }).optional().nullable(),
  typeUUID: z.string().uuid({ message: 'ID de tipo de cita inválido' }).optional().nullable(),
});

export type ScheduleNextAppointmentDto = z.infer<typeof ScheduleNextAppointmentSchema>;
