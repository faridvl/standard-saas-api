import { z } from 'zod';
import { CreatePatientSchema } from './create-patient.dto';

export const BulkImportPatientsSchema = z.object({
  patients: z
    .array(CreatePatientSchema)
    .min(1, 'Debe incluir al menos un paciente')
    .max(500, 'Máximo 500 pacientes por importación'),
});

export type BulkImportPatientsDto = z.infer<typeof BulkImportPatientsSchema>;
