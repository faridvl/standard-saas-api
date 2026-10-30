import { z } from 'zod';
import { isValidDayKey } from '@medical-records/domain/utils/lab-shipment-date.util';

export const UpdatePatientFlagsSchema = z
  .object({
    hearingAidsInLab: z.boolean().optional(),
    /** Día de envío al laboratorio, "YYYY-MM-DD". Solo con `hearingAidsInLab: true`. */
    hearingAidsInLabDate: z
      .string()
      .refine(isValidDayKey, { message: 'La fecha de envío debe ser un día válido (AAAA-MM-DD)' })
      .optional(),
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
  });

export type UpdatePatientFlagsDto = z.infer<typeof UpdatePatientFlagsSchema>;
