import { z } from 'zod';
import { isValidDayKey } from '@medical-records/domain/utils/lab-shipment-date.util';
import { PRIORITY_REASON_MAX_LENGTH } from '@medical-records/domain/utils/patient-priority.util';

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
    /**
     * Envío abierto cuya fecha se corrige. Con él, `hearingAidsInLabDate` solo corrige ese envío
     * y nunca abre uno nuevo; sin él, prender con el interruptor apagado abre un envío.
     */
    shipmentUuid: z.string().uuid({ message: 'El envío debe ser un uuid válido' }).optional(),
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
    isPriority: z.boolean().optional(),
    /** Motivo de la prioridad: obligatorio al marcarla (lo valida el caso de uso, pues depende de si ya estaba marcada). */
    priorityReason: z
      .string()
      .trim()
      .max(PRIORITY_REASON_MAX_LENGTH, `Máximo ${PRIORITY_REASON_MAX_LENGTH} caracteres`)
      .optional(),
  })
  .refine((dto) => Object.values(dto).some((value) => value !== undefined), {
    message: 'Indica al menos un indicador',
  })
  .refine((dto) => dto.hearingAidsInLabDate === undefined || dto.hearingAidsInLab === true, {
    message: 'La fecha de envío solo va al marcar los audífonos en laboratorio',
    path: ['hearingAidsInLabDate'],
  })
  .refine((dto) => dto.shipmentUuid === undefined || dto.hearingAidsInLabDate !== undefined, {
    message: 'Para corregir un envío indica la fecha de envío',
    path: ['shipmentUuid'],
  })
  .refine(
    (dto) =>
      (dto.deliveredAt === undefined && dto.note === undefined) || dto.hearingAidsInLab === false,
    {
      message: 'La fecha y la nota de entrega solo van al desmarcar los audífonos en laboratorio',
      path: ['deliveredAt'],
    },
  )
  .refine((dto) => dto.priorityReason === undefined || dto.isPriority === true, {
    message: 'El motivo solo va al marcar la prioridad',
    path: ['priorityReason'],
  });

export type UpdatePatientFlagsDto = z.infer<typeof UpdatePatientFlagsSchema>;
