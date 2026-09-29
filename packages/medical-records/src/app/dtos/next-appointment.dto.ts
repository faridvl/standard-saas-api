import { z } from 'zod';

export const ScheduleNextAppointmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Fecha inválida (YYYY-MM-DD)' }),
  branchUUID: z.string().uuid({ message: 'ID de sede inválido' }).optional().nullable(),
  typeUUID: z.string().uuid({ message: 'ID de tipo de cita inválido' }).optional().nullable(),
});

export type ScheduleNextAppointmentDto = z.infer<typeof ScheduleNextAppointmentSchema>;

/**
 * Mes tentativo de la próxima cita, cuando todavía no hay día confirmado.
 * `month: null` lo limpia (el paciente ya no va a volver, o se corrigió el
 * dato); en ese caso el tipo tampoco aplica.
 */
export const SetTentativeMonthSchema = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, { message: 'Mes inválido (YYYY-MM)' })
      .nullable(),
    typeUUID: z.string().uuid({ message: 'ID de tipo de cita inválido' }).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    // Anotar un mes exige decir de qué sería la cita, igual que al confirmar
    // el día. Limpiarlo (month null) no, porque no queda nada que tipificar.
    if (value.month && !value.typeUUID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['typeUUID'],
        message: 'El tipo de cita es obligatorio',
      });
    }
  });

export type SetTentativeMonthDto = z.infer<typeof SetTentativeMonthSchema>;
