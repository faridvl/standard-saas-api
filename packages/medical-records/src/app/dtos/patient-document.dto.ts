import { z } from 'zod';

export const RenamePatientDocumentSchema = z.object({
  originalName: z.string().min(1, 'El nombre es obligatorio').max(255, 'Máximo 255 caracteres'),
});

export type RenamePatientDocumentDto = z.infer<typeof RenamePatientDocumentSchema>;
