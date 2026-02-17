import { z } from 'zod';
import { MedicalSpeciality } from '../../domain/types/medical-control-content.types';

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

const FollowUpSchema = z
  .object({
    hasFollowUp: z.boolean(),
    tentativeDate: z.string().datetime().optional().nullable(),
    notes: z.string().optional(),
  })
  .optional();

export const CreateMedicalControlSchema = z.union([
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
