import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { env } from '@project/core';
import { IdentityRepository } from './identity.repository';

describe('IdentityRepository.getUser', () => {
  const originalFetch = global.fetch;
  const originalUrl = env.IDENTITY_SERVICE_URL;
  let fetchMock: jest.Mock;

  const respondWith = (body: unknown, ok = true) => {
    fetchMock.mockResolvedValue({ ok, json: () => Promise.resolve(body) });
  };

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as never;
    (env as { IDENTITY_SERVICE_URL?: string }).IDENTITY_SERVICE_URL = 'http://identity.test';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    (env as { IDENTITY_SERVICE_URL?: string }).IDENTITY_SERVICE_URL = originalUrl;
  });

  const build = () =>
    new IdentityRepository({ signAsync: () => Promise.resolve('token') } as never);

  it('uuid vacío o con espacios devuelve null sin llamar a identity', async () => {
    await expect(build().getUser('', 't1')).resolves.toBeNull();
    await expect(build().getUser('  ', 't1')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('una respuesta sin uuid (p. ej. la lista de usuarios) devuelve null', async () => {
    respondWith({ data: [{ uuid: 'a', fullName: 'Ana' }] });
    await expect(build().getUser('u1', 't1')).resolves.toBeNull();

    respondWith([{ uuid: 'a', fullName: 'Ana' }]);
    await expect(build().getUser('u1', 't1')).resolves.toBeNull();

    respondWith({ fullName: 'Ana' });
    await expect(build().getUser('u1', 't1')).resolves.toBeNull();
  });

  it('una respuesta con otro uuid devuelve null', async () => {
    respondWith({ uuid: 'otro', fullName: 'Ana' });
    await expect(build().getUser('u1', 't1')).resolves.toBeNull();
  });

  it('una respuesta correcta devuelve uuid y nombre', async () => {
    respondWith({ uuid: 'u1', fullName: 'Dra. Ana', email: 'x' });
    await expect(build().getUser('u1', 't1')).resolves.toEqual({
      uuid: 'u1',
      fullName: 'Dra. Ana',
    });
    expect(fetchMock).toHaveBeenCalledWith('http://identity.test/users/u1', expect.anything());
  });
});
