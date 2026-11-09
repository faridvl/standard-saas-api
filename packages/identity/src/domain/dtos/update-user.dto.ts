import { z } from 'zod';
import { ASSIGNABLE_USER_ROLES } from '../types/user.types';
import { isOwnBucketUrl } from '../utils/bucket-url.util';

const bucketUrlSchema = z
  .string()
  .url()
  .refine((value) => isOwnBucketUrl(value), 'La URL debe ser https y del almacenamiento propio');

export const UpdateUserSchema = z.object({
  fullName: z.string().min(1, 'El nombre es obligatorio').optional(),
  phoneNumber: z.string().optional(),
  specialty: z.string().optional(),
  role: z.enum(ASSIGNABLE_USER_ROLES).optional(),
  signatureUrl: bucketUrlSchema.optional().nullable(),
  avatarUrl: bucketUrlSchema.optional().nullable(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
