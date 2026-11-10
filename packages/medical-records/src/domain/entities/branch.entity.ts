import { BranchColor } from '@prisma/client';

export interface BranchEntity {
  id: number;
  uuid: string;
  tenantUuid: string;
  name: string;
  phone: string | null;
  address: string | null;
  color: BranchColor;
  isActive: boolean;
  createdAt: Date;
}
