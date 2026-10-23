import { z } from 'zod';

export const ClinicalFieldDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  fieldType: z.enum(['text', 'textarea', 'number', 'boolean', 'date', 'select']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  order: z.number().int().nonnegative(),
  /** Grupo en que se muestra el campo (p. ej. "Cirugías"); sin grupo va suelto. */
  section: z.string().trim().max(60).optional(),
  /** Solo para `boolean`: texto que se pide cuando la respuesta es Sí. */
  detailLabel: z.string().trim().max(120).optional(),
});

export const CreateClinicalTemplateSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido' }),
  speciality: z.string().min(1, { message: 'La especialidad es requerida' }),
  fields: z
    .array(ClinicalFieldDefinitionSchema)
    .min(1, { message: 'Debe incluir al menos un campo' }),
});

export const UpdateClinicalTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  speciality: z.string().min(1).optional(),
  fields: z.array(ClinicalFieldDefinitionSchema).min(1).optional(),
});

export type CreateClinicalTemplateDto = z.infer<typeof CreateClinicalTemplateSchema>;
export type UpdateClinicalTemplateDto = z.infer<typeof UpdateClinicalTemplateSchema>;
