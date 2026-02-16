// identity/src/domain/entities/user.entity.ts
export type User = {
  id: number;
  uuid: string;
  email: string;
  name: string;
  password: string;
  role?: string | null;
  tenantId: number;
  tenantUuid: string;
};
