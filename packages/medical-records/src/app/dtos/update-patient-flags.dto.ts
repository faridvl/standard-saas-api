import { z } from 'zod';
import { isValidDayKey } from '@medical-records/domain/utils/lab-shipment-date.util';

const LAB_NOTE_MAX_LENGTH = 1000;

/** Se recorta y "" (o solo espacios) queda como null. */
const labNote = z
  .string()
  .trim()
  .max(LAB_NOTE_MAX_LENGTH, `Máximo ${LAB_NOTE_MAX_LENGTH} caracteres`)
  .transform((value) => (value ? value : null));

export const UpdatePatientFlagsSchema = z
  .object({
    hearingAidsInLab: z.boolean().optional(),
    /** Día de envío al laboratorio, "YYYY-MM-DD". Solo con `hearingAidsInLab: true`. */
    hearingAidsInLabDate: z
      .string()
      .refine(isValidDayKey, { message: 'La fecha de envío debe ser un día válido (AAAA-MM-DD)' })
      .optional(),
    /** Día de entrega, "YYYY-MM-DD". Solo con `hearingAidsInLab: false`; sin él se usa hoy. */
    deliveredAt: z
      .string()
      .refine(isValidDayKey, { message: 'La fecha de entrega debe ser un día válido (AAAA-MM-DD)' })
      .optional(),
    /** Nota de la entrega. Solo con `hearingAidsInLab: false`; también queda en Control de evolución. */
    note: labNote.optional(),
    hasActiveWarranty: z.boolean().optional(),
    isVideoCandidate: z.boolean().optional(),
    warrantyExpired: z.boolean().optional(),
    renewPrescription: z.boolean().optional(),
  })
  .refine((dto) => Object.values(dto).some((value) => value !== undefined), {
    message: 'Indica al menos un indicador',
  })
  .refine((dto) => dto.hearingAidsInLabDate === undefined || dto.hearingAidsInLab === true, {
    message: 'La fecha de envío solo va al marcar los audífonos en laboratorio',
    path: ['hearingAidsInLabDate'],
  })
  .refine(
    (dto) =>
      (dto.deliveredAt === undefined && dto.note === undefined) || dto.hearingAidsInLab === false,
    {
      message: 'La fecha y la nota de entrega solo van al desmarcar los audífonos en laboratorio',
      path: ['deliveredAt'],
    },
  );

export type UpdatePatientFlagsDto = z.infer<typeof UpdatePatientFlagsSchema>;
