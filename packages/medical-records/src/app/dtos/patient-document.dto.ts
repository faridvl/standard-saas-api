import { z } from 'zod';
import { DocumentCategory } from '@prisma/client';

export const UpdatePatientDocumentSchema = z
  .object({
    originalName: z
      .string()
      .min(1, 'El nombre es obligatorio')
      .max(255, 'Máximo 255 caracteres')
      .optional(),
    category: z.nativeEnum(DocumentCategory, { message: 'Sección inválida' }).optional(),
  })
  .refine((dto) => dto.originalName !== undefined || dto.category !== undefined, {
    message: 'Indica el nombre o la sección del documento',
  });

export type UpdatePatientDocumentDto = z.infer<typeof UpdatePatientDocumentSchema>;
