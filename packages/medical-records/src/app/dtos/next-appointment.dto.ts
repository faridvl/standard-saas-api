import { z } from 'zod';

export const ScheduleNextAppointmentSchema = z.object({
  startTime: z.string().datetime({ message: 'Fecha y hora inválida (ISO 8601)' }),
  branchUUID: z.string().uuid({ message: 'ID de sede inválido' }).optional().nullable(),
});

export type ScheduleNextAppointmentDto = z.infer<typeof ScheduleNextAppointmentSchema>;
