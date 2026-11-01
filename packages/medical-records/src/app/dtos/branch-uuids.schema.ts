import { z } from 'zod';

export const BranchUuidsSchema = z
  .array(z.string().uuid({ message: 'ID de sede inválido' }))
  .refine((uuids) => new Set(uuids).size === uuids.length, {
    message: 'Las sedes no pueden repetirse',
  });
