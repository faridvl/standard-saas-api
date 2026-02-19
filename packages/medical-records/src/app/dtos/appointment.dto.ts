import { z } from 'zod';
import { AppointmentStatus } from '../../domain/types/appointment.types';
import { MedicalSpeciality } from '../../domain/types/medical-control-content.types';

export const CreateAppointmentSchema = z.object({
  patientUUID: z.string().uuid({ message: 'ID de paciente inválido' }),
  typeUUID: z.string().uuid({ message: 'ID de tipo de cita inválido' }).optional().nullable(),
  speciality: z.nativeEnum(MedicalSpeciality),
  status: z.nativeEnum(AppointmentStatus).optional().default(AppointmentStatus.PENDING),
  date: z.string().datetime({ message: 'Fecha de cita inválida (ISO 8601)' }),
  startTime: z.string().datetime({ message: 'Hora de inicio inválida' }),
  endTime: z.string().datetime({ message: 'Hora de fin inválida' }),
  notes: z.string().max(500).optional(),
});

export type CreateAppointmentDto = z.infer<typeof CreateAppointmentSchema>;

export const UpdateAppointmentSchema = z.object({
  status: z.nativeEnum(AppointmentStatus).optional(),
  date: z.string().datetime().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export type UpdateAppointmentDto = z.infer<typeof UpdateAppointmentSchema>;
