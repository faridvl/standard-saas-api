// identity/src/domain/entities/user.entity.ts
import { UserStatus } from '../types/user.types';

export type User = {
  id: number;
  uuid: string;
  email: string;
  name: string;
  password: string;
  role?: string | null;
  status: UserStatus;
  tenantId: number;
  tenantUuid: string;
  specialty?: string | null;
};
