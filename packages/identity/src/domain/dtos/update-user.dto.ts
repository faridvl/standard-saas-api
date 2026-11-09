import { z } from 'zod';
import { ASSIGNABLE_USER_ROLES } from '../types/user.types';
import { isOwnBucketUrl } from '../utils/bucket-url.util';
import {
  acceptLegacySpecialty,
  licenseNumberSchema,
  professionalTitleSchema,
  specialtiesSchema,
} from '../validations/professional.schema';

const bucketUrlSchema = z
  .string()
  .url()
  .refine((value) => isOwnBucketUrl(value), 'La URL debe ser https y del almacenamiento propio');

export const UpdateUserSchema = z.preprocess(
  acceptLegacySpecialty,
  z.object({
    fullName: z.string().min(1, 'El nombre es obligatorio').optional(),
    phoneNumber: z.string().optional(),
    role: z.enum(ASSIGNABLE_USER_ROLES).optional(),
    attendsPatients: z.boolean().optional(),
    specialties: specialtiesSchema.optional(),
    professionalTitle: professionalTitleSchema.optional().nullable(),
    licenseNumber: licenseNumberSchema.optional().nullable(),
    signatureUrl: bucketUrlSchema.optional().nullable(),
    avatarUrl: bucketUrlSchema.optional().nullable(),
  }),
);

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
