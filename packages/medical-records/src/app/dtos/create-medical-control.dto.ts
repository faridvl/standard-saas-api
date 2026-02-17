import { z } from 'zod';
import { MedicalSpeciality } from '../../domain/types/medical-control-content.types';

// 1. Esquemas de hallazgos (Findings)
const AudiologyFindingsSchema = z
  .object({
    otoscopyRight: z.string(),
    otoscopyLeft: z.string(),
    cleaningPerformed: z.boolean(),
    usesAuxiliaries: z.boolean(),
    tinnitus: z.boolean().optional(),
  })
  .strict();
const GeneralFindingsSchema = z.record(z.string(), z.unknown());

// 2. Esquema de FollowUp
const FollowUpSchema = z
  .object({
    hasFollowUp: z.boolean(),
    tentativeDate: z.string().datetime().optional().nullable(),
    notes: z.string().optional(),
  })
  .optional();

// 3. El esquema principal usando z.union
export const CreateMedicalControlSchema = z.union([
  // Caso AUDIOLOGY
  z.object({
    header: z.object({
      patientUUID: z.string().uuid(),
      appointmentUUID: z.string().uuid().optional().nullable(),
      speciality: z.literal(MedicalSpeciality.AUDIOLOGY),
      schemaVersion: z.number().int().default(1),
    }),
    clinicalData: z.object({
      findings: AudiologyFindingsSchema,
      diagnosis: z.string().min(1),
    }),
    followUp: FollowUpSchema,
  }),

  // Caso GENERAL u otros
  z.object({
    header: z.object({
      patientUUID: z.string().uuid(),
      appointmentUUID: z.string().uuid().optional().nullable(),
      speciality: z.literal(MedicalSpeciality.GENERAL),
      schemaVersion: z.number().int().default(1),
    }),
    clinicalData: z.object({
      findings: GeneralFindingsSchema,
      diagnosis: z.string().min(1),
    }),
    followUp: FollowUpSchema,
  }),
]);

export type CreateMedicalControlDto = z.infer<typeof CreateMedicalControlSchema>;
