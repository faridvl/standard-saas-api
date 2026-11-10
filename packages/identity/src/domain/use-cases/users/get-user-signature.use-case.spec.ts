import { describe, it, expect } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import {
  ProfessionalTitle,
  UserActor,
  UserDomain,
  UserRole,
  UserStatus,
} from '../../types/user.types';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { GetUserSignatureUseCase } from './get-user-signature.use-case';

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
    professionalTitle: ProfessionalTitle.LIC,
    licenseNumber: 'COL-123',
    phoneNumber: '8888-8888',
    status,
    createdAt: new Date('2026-01-01'),
  };
}

function build(users: UserDomain[]): GetUserSignatureUseCase {
  const storage = {
    findByUuidAndTenant: (uuid: string, tenantUuid: string) =>
      Promise.resolve(users.find((u) => u.uuid === uuid && u.tenantUUID === tenantUuid) ?? null),
  } as unknown as UserStorage;
  return new GetUserSignatureUseCase(storage);
}

const actorOf = (user: UserDomain): UserActor => ({
  uuid: user.uuid,
  role: user.role ?? undefined,
  tenantId: user.tenantId,
  tenantUuid: TENANT,
});

describe('GetUserSignatureUseCase', () => {
  const author = makeUser('author', UserRole.OWNER);
  const reception = makeUser('reception', UserRole.RECEPTION);
  const inactive = makeUser('inactive', UserRole.OWNER, UserStatus.INACTIVE);
  const all = [author, reception, inactive];

  it('un usuario de la misma clínica, aunque sea Recepción, recibe la firma', async () => {
    await expect(build(all).execute('author', actorOf(reception))).resolves.toEqual({
      uuid: 'author',
      fullName: 'Nombre author',
      professionalTitle: ProfessionalTitle.LIC,
      licenseNumber: 'COL-123',
    });
  });

  it('la respuesta no trae más campos que los de la firma', async () => {
    const result = await build(all).execute('author', actorOf(reception));
    expect(Object.keys(result).sort()).toEqual(
      ['fullName', 'licenseNumber', 'professionalTitle', 'uuid'].sort(),
    );
  });

  it('un usuario inactivo devuelve igual su firma', async () => {
    await expect(build(all).execute('inactive', actorOf(reception))).resolves.toMatchObject({
      uuid: 'inactive',
      licenseNumber: 'COL-123',
    });
  });

  it('sin título ni colegiado devuelve null en ambos', async () => {
    const bare = { ...makeUser('bare', UserRole.RECEPTION), professionalTitle: undefined };
    const result = await build([bare, reception]).execute('bare', actorOf(reception));
    expect(result).toMatchObject({ professionalTitle: null });
  });

  it('usuario de otra clínica: 404', async () => {
    await expect(
      build(all).execute('author', { ...actorOf(reception), tenantUuid: 'tenant-b' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('usuario inexistente: 404', async () => {
    await expect(build(all).execute('nadie', actorOf(reception))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
