import { z } from 'zod';
import { UserStatus } from '../types/user.types';

export const UpdateUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

export type UpdateUserStatusDto = z.infer<typeof UpdateUserStatusSchema>;
