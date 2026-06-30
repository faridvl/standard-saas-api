import { z } from 'zod';
import { MedicalSpeciality } from '../../domain/types/medical-control-content.types';

const AudiologyFindingsSchema = z.object({
  otoscopyRight: z.string().optional().default(''),
  otoscopyLeft: z.string().optional().default(''),
  cleaningPerformed: z.boolean().optional().default(false),
  usesAuxiliaries: z.boolean().optional().default(false),
  tinnitus: z.boolean().optional().default(false),
  audiogram: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
});
const GeneralFindingsSchema = z.record(z.string(), z.unknown());

const FollowUpSchema = z
  .object({
    hasFollowUp: z.boolean(),
    tentativeDate: z.string().datetime().optional().nullable(),
    notes: z.string().optional(),
  })
  .optional();

const AudiologyControlSchema = z.object({
  header: z.object({
    patientUUID: z.string().uuid({ message: 'patientUUID debe ser un UUID válido' }),
    appointmentUUID: z.string().uuid().optional().nullable(),
    speciality: z.literal(MedicalSpeciality.AUDIOLOGY),
    schemaVersion: z.number().int().default(1),
  }),
  clinicalData: z.object({
    findings: AudiologyFindingsSchema,
    diagnosis: z.string().min(1, { message: 'El diagnóstico es requerido' }),
  }),
  followUp: FollowUpSchema,
});

const GeneralControlSchema = z.object({
  header: z.object({
    patientUUID: z.string().uuid({ message: 'patientUUID debe ser un UUID válido' }),
    appointmentUUID: z.string().uuid().optional().nullable(),
    speciality: z.literal(MedicalSpeciality.GENERAL),
    schemaVersion: z.number().int().default(1),
  }),
  clinicalData: z.object({
    findings: GeneralFindingsSchema,
    diagnosis: z.string().min(1, { message: 'El diagnóstico es requerido' }),
  }),
  followUp: FollowUpSchema,
});

const schemaBySpeciality: Record<string, z.ZodTypeAny> = {
  [MedicalSpeciality.AUDIOLOGY]: AudiologyControlSchema,
  [MedicalSpeciality.GENERAL]: GeneralControlSchema,
};

export const CreateMedicalControlSchema = z
  .object({ header: z.object({ speciality: z.string() }).passthrough() })
  .passthrough()
  .superRefine((data, ctx) => {
    const speciality = (data as any).header?.speciality as string | undefined;
    const targeted = speciality ? schemaBySpeciality[speciality] : undefined;

    if (!targeted) {
      ctx.addIssue({
        code: 'custom',
        path: ['header', 'speciality'],
        message: `Especialidad inválida: "${speciality}". Valores permitidos: ${Object.keys(schemaBySpeciality).join(', ')}`,
      });
      return;
    }

    const result = targeted.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          code: 'custom',
          path: issue.path as string[],
          message: issue.message,
        });
      }
    }
  })
  .transform((data) => {
    const speciality = (data as any).header?.speciality as string | undefined;
    const targeted = speciality ? schemaBySpeciality[speciality] : undefined;
    return targeted ? targeted.parse(data) : data;
  }) as z.ZodType<CreateMedicalControlDto>;

export type CreateMedicalControlDto = z.infer<typeof AudiologyControlSchema> | z.infer<typeof GeneralControlSchema>;
