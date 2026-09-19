import { z } from 'zod';
import { DocumentCategory } from '@prisma/client';

export const CreatePatientNoteSchema = z.object({
  text: z.string().min(1, 'La nota es obligatoria').max(500, 'Máximo 500 caracteres'),
  category: z.nativeEnum(DocumentCategory).optional().default(DocumentCategory.EVOLUTION_CONTROL),
});

export type CreatePatientNoteDto = z.infer<typeof CreatePatientNoteSchema>;
