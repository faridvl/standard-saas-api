import { z } from 'zod';

export const DOCUMENT_TEMPLATE_NAME_MAX = 120;
export const DOCUMENT_TEMPLATE_DESCRIPTION_MAX = 300;
export const DOCUMENT_TEMPLATE_CONTENT_MAX = 20000;

export const DocumentTemplateBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'El nombre es requerido' })
    .max(DOCUMENT_TEMPLATE_NAME_MAX, {
      message: `El nombre no puede pasar de ${DOCUMENT_TEMPLATE_NAME_MAX} caracteres`,
    }),
  description: z
    .string()
    .trim()
    .max(DOCUMENT_TEMPLATE_DESCRIPTION_MAX, {
      message: `La descripción no puede pasar de ${DOCUMENT_TEMPLATE_DESCRIPTION_MAX} caracteres`,
    })
    .nullish(),
  content: z
    .string()
    .max(DOCUMENT_TEMPLATE_CONTENT_MAX, {
      message: `El contenido no puede pasar de ${DOCUMENT_TEMPLATE_CONTENT_MAX} caracteres`,
    })
    .refine((value) => value.trim().length > 0, { message: 'El contenido es requerido' }),
});

export type DocumentTemplateBodyDto = z.infer<typeof DocumentTemplateBodySchema>;
