import { describe, it, expect, jest } from '@jest/globals';
import { GetOrCreateUserUseCase, USER_CACHE_TTL_MS } from './get-or-create-user.use-case';

type LocalUser = { fullName: string; updatedAt: Date } | null;

describe('GetOrCreateUserUseCase', () => {
  const build = (
    identityUser: { uuid: string; fullName: string } | null = null,
    localUser: LocalUser = null,
  ) => {
    const findByUuid = jest.fn().mockResolvedValue(localUser);
    const upsert = jest
      .fn()
      .mockImplementation((_uuid: unknown, _tenant: unknown, fullName: unknown) =>
        Promise.resolve({ fullName }),
      );
    const getUser = jest.fn().mockResolvedValue(identityUser);
    const useCase = new GetOrCreateUserUseCase(
      { findByUuid, upsert } as never,
      { getUser } as never,
    );
    return { useCase, findByUuid, upsert, getUser };
  };

  const hace = (ms: number) => new Date(Date.now() - ms);

  it.each(['', '   ', '\t\n'])('uuid vacío (%j) devuelve null sin consultar nada', async (uuid) => {
    const { useCase, findByUuid, getUser, upsert } = build();

    await expect(useCase.execute(uuid, 't1')).resolves.toBeNull();

    expect(findByUuid).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('usuario nuevo: pide el usuario a identity y lo guarda', async () => {
    const { useCase, upsert } = build({ uuid: 'u1', fullName: 'Dra. Ana' });

    await expect(useCase.execute('u1', 't1')).resolves.toBe('Dra. Ana');

    expect(upsert).toHaveBeenCalledWith('u1', 't1', 'Dra. Ana');
  });

  it('copia local reciente: la usa sin consultar a identity', async () => {
    const { useCase, getUser } = build(
      { uuid: 'u1', fullName: 'Nombre nuevo' },
      { fullName: 'Dra. Ana', updatedAt: hace(1000) },
    );

    await expect(useCase.execute('u1', 't1')).resolves.toBe('Dra. Ana');

    expect(getUser).not.toHaveBeenCalled();
  });

  it('usuario renombrado: con la copia vencida toma el nombre nuevo de identity', async () => {
    const { useCase, upsert } = build(
      { uuid: 'u1', fullName: 'Dra. Ana Mora' },
      { fullName: 'Dra. Ana', updatedAt: hace(USER_CACHE_TTL_MS + 1000) },
    );

    await expect(useCase.execute('u1', 't1')).resolves.toBe('Dra. Ana Mora');

    expect(upsert).toHaveBeenCalledWith('u1', 't1', 'Dra. Ana Mora');
  });

  it('identity caído con copia vencida: devuelve el nombre local', async () => {
    const { useCase, upsert } = build(null, {
      fullName: 'Dra. Ana',
      updatedAt: hace(USER_CACHE_TTL_MS + 1000),
    });

    await expect(useCase.execute('u1', 't1')).resolves.toBe('Dra. Ana');

    expect(upsert).not.toHaveBeenCalled();
  });
});
