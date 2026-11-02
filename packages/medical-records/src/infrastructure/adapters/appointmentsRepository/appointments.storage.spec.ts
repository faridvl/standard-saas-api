import { describe, it, expect, jest } from '@jest/globals';
import { AppointmentStorage } from './appointments.storage';

type CapturedQuery = { where: { startTime: { gte: Date; lt: Date } } };

describe('AppointmentStorage.findAll', () => {
  const buildStorage = () => {
    const count = jest.fn().mockResolvedValue(0);
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { appointment: { count, findMany } };
    const storage = new AppointmentStorage(prisma as never);
    return { storage, count, findMany };
  };

  it('filtra ?date por el día de Costa Rica, no por el día UTC', async () => {
    const { storage, count, findMany } = buildStorage();

    await storage.findAll('tenant-1', { page: 1, limit: 10, date: '2026-11-03' });

    const { where } = count.mock.calls[0][0] as CapturedQuery;
    expect(where.startTime.gte.toISOString()).toBe('2026-11-03T06:00:00.000Z');
    expect(where.startTime.lt.toISOString()).toBe('2026-11-04T06:00:00.000Z');
    expect((findMany.mock.calls[0][0] as CapturedQuery).where).toEqual(where);
  });

  it('sin date no filtra por hora', async () => {
    const { storage, count } = buildStorage();

    await storage.findAll('tenant-1', { page: 1, limit: 10 });

    expect((count.mock.calls[0][0] as CapturedQuery).where).toEqual({ tenantUUID: 'tenant-1' });
  });
});
