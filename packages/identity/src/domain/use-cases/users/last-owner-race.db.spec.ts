import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { PrismaClient, Status } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { PrismaService } from '../../../infrastructure/adapters/prisma/prisma.service';
import { UserActor, UserRole, UserStatus } from '../../types/user.types';
import { UpdateUserUseCase } from './update-user.use-case';
import { SetUserStatusUseCase } from './set-user-status.use-case';

/**
 * Contra una base real de pruebas: se activa con IDENTITY_DB_TESTS=1 e IDENTITY_DB_URL apuntando
 * a la base de pruebas (nunca producción). Crea clínicas propias y las borra al terminar.
 */
const enabled = process.env.IDENTITY_DB_TESTS === '1' && !!process.env.IDENTITY_DB_URL;
const describeDb = enabled ? describe : describe.skip;

const TENANT_PREFIX = 'race-test-tenant';

describeDb('Último propietario con peticiones en paralelo', () => {
  let pool: Pool;
  let prisma: PrismaClient;
  let storage: UserStorage;
  let update: UpdateUserUseCase;
  let setStatus: SetUserStatusUseCase;

  const createClinic = async (name: string) => {
    const tenantUuid = `${TENANT_PREFIX}-${name}`;
    const tenant = await prisma.tenant.create({
      data: { uuid: tenantUuid, businessName: tenantUuid },
    });
    const owners = await Promise.all(
      ['a', 'b'].map((suffix) =>
        prisma.user.create({
          data: {
            uuid: `${tenantUuid}-${suffix}`,
            email: `${tenantUuid}-${suffix}@race.test`,
            name: suffix,
            password: 'hash',
            role: UserRole.OWNER,
            tenantId: tenant.id,
            tenantUUID: tenantUuid,
          },
        }),
      ),
    );
    const actor = (index: number): UserActor => ({
      uuid: owners[index].uuid,
      tenantUuid,
    });
    return { actor, a: owners[0].uuid, b: owners[1].uuid, tenantUuid };
  };

  const activeOwners = (tenantUuid: string) =>
    prisma.user.count({
      where: { tenantUUID: tenantUuid, role: UserRole.OWNER, status: Status.ACTIVE },
    });

  const cleanup = async () => {
    await prisma.$executeRaw`DELETE FROM "UserAudit" WHERE "tenantUUID" LIKE ${TENANT_PREFIX + '%'}`;
    await prisma.$executeRaw`DELETE FROM "User" WHERE "tenantUUID" LIKE ${TENANT_PREFIX + '%'}`;
    await prisma.$executeRaw`DELETE FROM "Tenant" WHERE "uuid" LIKE ${TENANT_PREFIX + '%'}`;
  };

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.IDENTITY_DB_URL, max: 5 });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    storage = new UserStorage(prisma as unknown as PrismaService);
    update = new UpdateUserUseCase(storage);
    setStatus = new SetUserStatusUseCase(storage);
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
    await pool.end();
  });

  it('dos propietarios que se degradan a la vez: uno pasa y el otro recibe 400', async () => {
    const clinic = await createClinic('demote');
    const results = await Promise.allSettled([
      update.execute(clinic.b, clinic.actor(0), { role: UserRole.ADMIN }),
      update.execute(clinic.a, clinic.actor(1), { role: UserRole.ADMIN }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await activeOwners(clinic.tenantUuid)).toBe(1);
  });

  it('dos propietarios que se desactivan a la vez: uno pasa y el otro recibe 400', async () => {
    const clinic = await createClinic('deactivate');
    const results = await Promise.allSettled([
      setStatus.execute(clinic.b, UserStatus.INACTIVE, clinic.actor(0)),
      setStatus.execute(clinic.a, UserStatus.INACTIVE, clinic.actor(1)),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await activeOwners(clinic.tenantUuid)).toBe(1);
  });

  it('degradar a uno y desactivar al otro a la vez deja al menos un propietario', async () => {
    const clinic = await createClinic('mixed');
    await Promise.allSettled([
      update.execute(clinic.b, clinic.actor(0), { role: UserRole.RECEPTION }),
      setStatus.execute(clinic.a, UserStatus.INACTIVE, clinic.actor(1)),
    ]);
    expect(await activeOwners(clinic.tenantUuid)).toBe(1);
  });
});
