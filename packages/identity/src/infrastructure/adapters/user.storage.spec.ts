import { describe, it, expect } from '@jest/globals';
import { PrismaService } from './prisma/prisma.service';
import { UserStorage } from './user.storage';

function build(): { storage: UserStorage; wheres: unknown[] } {
  const wheres: unknown[] = [];
  const prisma = {
    user: {
      findFirst: (args: { where: unknown }) => {
        wheres.push(args.where);
        return Promise.resolve(null);
      },
    },
  } as unknown as PrismaService;
  return { storage: new UserStorage(prisma), wheres };
}

describe('UserStorage.findByUuidAndTenant', () => {
  it('con la clínica consulta por uuid y clínica', async () => {
    const { storage, wheres } = build();
    await storage.findByUuidAndTenant('u1', 'tenant-a');
    expect(wheres).toEqual([{ uuid: 'u1', tenantUUID: 'tenant-a' }]);
  });

  it.each([undefined, ''])('con la clínica %p devuelve null sin consultar', async (tenant) => {
    const { storage, wheres } = build();
    await expect(storage.findByUuidAndTenant('u1', tenant)).resolves.toBeNull();
    expect(wheres).toHaveLength(0);
  });
});
