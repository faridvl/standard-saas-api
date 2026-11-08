import { describe, it, expect, jest } from '@jest/globals';
import { GetOrCreateUserUseCase } from './get-or-create-user.use-case';

describe('GetOrCreateUserUseCase', () => {
  const build = (identityUser: { uuid: string; fullName: string } | null = null) => {
    const findByUuid = jest.fn().mockResolvedValue(null);
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

  it.each(['', '   ', '\t\n'])('uuid vacío (%j) devuelve null sin consultar nada', async (uuid) => {
    const { useCase, findByUuid, getUser, upsert } = build();

    await expect(useCase.execute(uuid, 't1')).resolves.toBeNull();

    expect(findByUuid).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('con uuid válido pide el usuario a identity y lo guarda', async () => {
    const { useCase, upsert } = build({ uuid: 'u1', fullName: 'Dra. Ana' });

    await expect(useCase.execute('u1', 't1')).resolves.toBe('Dra. Ana');

    expect(upsert).toHaveBeenCalledWith('u1', 't1', 'Dra. Ana');
  });
});
