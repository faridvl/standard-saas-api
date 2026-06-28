import { z } from 'zod';

const ClinicalFieldDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  fieldType: z.enum(['text', 'textarea', 'number', 'boolean', 'date', 'select']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  order: z.number().int().nonnegative(),
});

export const CreateClinicalTemplateSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido' }),
  speciality: z.string().min(1, { message: 'La especialidad es requerida' }),
  fields: z.array(ClinicalFieldDefinitionSchema).min(1, { message: 'Debe incluir al menos un campo' }),
});

export const UpdateClinicalTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  speciality: z.string().min(1).optional(),
  fields: z.array(ClinicalFieldDefinitionSchema).min(1).optional(),
});

export type CreateClinicalTemplateDto = z.infer<typeof CreateClinicalTemplateSchema>;
export type UpdateClinicalTemplateDto = z.infer<typeof UpdateClinicalTemplateSchema>;
