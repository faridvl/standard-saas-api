import { z } from 'zod';

/** Quitar o volver a mostrar un calendario: una sede, o una sede y un tipo de cita. */
export const SetCalendarVisibilitySchema = z.object({
  branchUuid: z.string().uuid({ message: 'ID de sede inválido' }),
  typeUuid: z.string().uuid({ message: 'ID de tipo de cita inválido' }).optional().nullable(),
  isRemoved: z.boolean(),
});

export type SetCalendarVisibilityDto = z.infer<typeof SetCalendarVisibilitySchema>;
