import { describe, it, expect } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { UserActor, UserDomain, UserRole, UserStatus } from '../../types/user.types';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { FindOneUserUseCase } from './find-one-user.use-case';

const TENANT = 'tenant-a';

function makeUser(uuid: string, role: UserRole, status = UserStatus.ACTIVE): UserDomain {
  return {
    uuid,
    email: `${uuid}@correo.test`,
    fullName: `Nombre ${uuid}`,
    role,
    tenantId: 1,
    tenantUUID: TENANT,
    attendsPatients: true,
    specialties: [],
    licenseNumber: 'COL-123',
    phoneNumber: '8888-8888',
    status,
    createdAt: new Date('2026-01-01'),
  };
}

function build(users: UserDomain[]): FindOneUserUseCase {
  const storage = {
    findByUuidAndTenant: (uuid: string, tenantUuid: string) =>
      Promise.resolve(users.find((u) => u.uuid === uuid && u.tenantUUID === tenantUuid) ?? null),
  } as unknown as UserStorage;
  return new FindOneUserUseCase(storage);
}

const actorOf = (user: UserDomain): UserActor => ({
  uuid: user.uuid,
  role: user.role ?? undefined,
  tenantId: user.tenantId,
  tenantUuid: TENANT,
});

describe('FindOneUserUseCase', () => {
  const owner = makeUser('owner', UserRole.OWNER);
  const admin = makeUser('admin', UserRole.ADMIN);
  const reception = makeUser('reception', UserRole.RECEPTION);
  const inactiveAdmin = makeUser('inactive-admin', UserRole.ADMIN, UserStatus.INACTIVE);
  const all = [owner, admin, reception, inactiveAdmin];

  it('Propietario y Administración ven la ficha completa de otro usuario', async () => {
    const useCase = build(all);
    await expect(useCase.execute('reception', actorOf(owner))).resolves.toEqual(reception);
    await expect(useCase.execute('reception', actorOf(admin))).resolves.toEqual(reception);
  });

  it('Recepción ve de otro usuario solo uuid, nombre y estado', async () => {
    const result = await build(all).execute('owner', actorOf(reception));
    expect(result).toEqual({ uuid: 'owner', fullName: 'Nombre owner', status: UserStatus.ACTIVE });
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('licenseNumber');
  });

  it('cada quien ve su propia ficha completa', async () => {
    await expect(build(all).execute('reception', actorOf(reception))).resolves.toEqual(reception);
  });

  it('el servicio de historias (token del propio usuario) lee a un inactivo con su nombre y estado', async () => {
    const result = await build(all).execute('inactive-admin', actorOf(inactiveAdmin));
    expect(result).toMatchObject({ uuid: 'inactive-admin', status: UserStatus.INACTIVE });
  });

  it('un Administración inactivo ya no ve fichas completas de otros', async () => {
    const result = await build(all).execute('owner', actorOf(inactiveAdmin));
    expect(result).not.toHaveProperty('email');
  });

  it('usuario de otra clínica o inexistente: 404', async () => {
    const useCase = build(all);
    await expect(
      useCase.execute('owner', { ...actorOf(admin), tenantUuid: 'tenant-b' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(useCase.execute('nadie', actorOf(admin))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
