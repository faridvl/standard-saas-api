import { z } from 'zod';

export const UpsertPatientBackgroundSchema = z.object({
  earInfections: z.boolean().default(false),
  nasalSurgery: z.boolean().default(false),
  throatSurgery: z.boolean().default(false),
  earSurgery: z.boolean().default(false),
  diabetes: z.boolean().default(false),
  cholesterol: z.boolean().default(false),
  highPressure: z.boolean().default(false),
  allergies: z.boolean().default(false),
  rhinitis: z.boolean().default(false),
  vertigo: z.boolean().default(false),
  tinnitus: z.boolean().default(false),
  headacheNoise: z.boolean().default(false),
  cloggedEar: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

export type UpsertPatientBackgroundDto = z.infer<typeof UpsertPatientBackgroundSchema>;
