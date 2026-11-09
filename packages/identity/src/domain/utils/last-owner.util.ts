import { ConflictException } from '@nestjs/common';
import { UserStorage } from '../../infrastructure/adapters/user.storage';
import { UserDomain, UserRole, UserStatus } from '../types/user.types';

/** La clínica nunca queda sin un OWNER activo: bloquea quitárselo al último. */
export async function assertNotLastActiveOwner(
  storage: UserStorage,
  target: UserDomain,
  tenantUuid: string,
): Promise<void> {
  if (target.role !== UserRole.OWNER || target.status !== UserStatus.ACTIVE) return;

  const otherOwners = await storage.countActiveOwners(tenantUuid, target.uuid);
  if (otherOwners === 0) {
    throw new ConflictException('La clínica debe conservar al menos un propietario activo');
  }
}
