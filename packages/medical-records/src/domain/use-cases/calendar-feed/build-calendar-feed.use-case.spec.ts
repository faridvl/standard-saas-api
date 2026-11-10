import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { BuildCalendarFeedUseCase } from './build-calendar-feed.use-case';

const FEED = {
  id: 1,
  userUuid: 'user-1',
  tenantUuid: 'tenant-1',
  token: 'token-1',
  removedCalendarKeys: [] as string[],
};

describe('BuildCalendarFeedUseCase: dueño del enlace', () => {
  let storage: {
    findByToken: jest.Mock;
    findEvents: jest.Mock;
    findBranchName: jest.Mock;
    findAppointmentTypeName: jest.Mock;
    markFetched: jest.Mock;
  };
  let identity: { getUser: jest.Mock };

  const build = () => new BuildCalendarFeedUseCase(storage as never, identity as never);

  beforeEach(() => {
    storage = {
      findByToken: jest.fn().mockResolvedValue(FEED as never),
      findEvents: jest.fn().mockResolvedValue([] as never),
      findBranchName: jest.fn(),
      findAppointmentTypeName: jest.fn(),
      markFetched: jest.fn(),
    };
    identity = { getUser: jest.fn() };
  });

  it('dueño activo: entrega el calendario', async () => {
    identity.getUser.mockResolvedValue({
      uuid: 'user-1',
      fullName: 'Ana',
      status: 'ACTIVE',
    } as never);

    const ics = await build().execute('token-1');

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(identity.getUser).toHaveBeenCalledWith('user-1', 'tenant-1');
    expect(storage.findEvents).toHaveBeenCalled();
  });

  it('dueño inactivo: 404 y no consulta citas', async () => {
    identity.getUser.mockResolvedValue({
      uuid: 'user-1',
      fullName: 'Ana',
      status: 'INACTIVE',
    } as never);

    await expect(build().execute('token-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.findEvents).not.toHaveBeenCalled();
  });

  it('dueño que no existe (o identity sin respuesta): 404', async () => {
    identity.getUser.mockResolvedValue(null as never);

    await expect(build().execute('token-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.findEvents).not.toHaveBeenCalled();
  });

  it('respuesta de identity sin estado: 404', async () => {
    identity.getUser.mockResolvedValue({ uuid: 'user-1', fullName: 'Ana' } as never);

    await expect(build().execute('token-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('token inexistente: calendario vacío sin llamar a identity', async () => {
    storage.findByToken.mockResolvedValue(null as never);

    const ics = await build().execute('nope');

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(identity.getUser).not.toHaveBeenCalled();
  });
});
