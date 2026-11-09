import { describe, it, expect, jest } from '@jest/globals';
import { PatientStorage } from './patient.storage';

type CapturedWhere = { AND: { OR: { uuid?: { in: string[] } }[] }[] };

describe('PatientStorage.findAllByTenant con nextAppointmentMonths', () => {
  // 31-oct 19:00 en Costa Rica: ya es noviembre en UTC.
  const OCTOBER_EVENING_CR = new Date('2026-11-01T01:00:00.000Z');

  const run = async (months: string[]) => {
    const patientFindMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      patient: { findMany: patientFindMany, count: jest.fn().mockResolvedValue(0) },
      appointment: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ patientUUID: 'patient-oct', startTime: OCTOBER_EVENING_CR }]),
      },
      appointmentType: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const storage = new PatientStorage(prisma as never);

    await storage.findAllByTenant('tenant-1', 1, 10, false, undefined, months);

    const { where } = patientFindMany.mock.calls[0][0] as { where: CapturedWhere };
    return where.AND.flatMap((condition) => condition.OR).find((c) => c.uuid)?.uuid?.in;
  };

  it('una cita del 31 de octubre a las 19:00 de Costa Rica cuenta en octubre', async () => {
    expect(await run(['2026-10'])).toEqual(['patient-oct']);
  });

  it('esa misma cita no cuenta en noviembre', async () => {
    expect(await run(['2026-11'])).toEqual([]);
  });
});

describe('PatientStorage.findAllByTenant con los filtros de prioridad y de laboratorio', () => {
  const run = async (filters: Record<string, unknown>) => {
    const patientFindMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      patient: { findMany: patientFindMany, count: jest.fn().mockResolvedValue(0) },
      appointment: { findMany: jest.fn().mockResolvedValue([]) },
      appointmentType: { findMany: jest.fn().mockResolvedValue([]) },
    };
    await new PatientStorage(prisma as never).findAllByTenant(
      'tenant-1',
      1,
      10,
      false,
      undefined,
      undefined,
      filters,
    );
    const { where } = patientFindMany.mock.calls[0][0] as { where: { AND?: unknown[] } };
    return where.AND ?? [];
  };

  it('isPriority pide solo los marcados', async () => {
    expect(await run({ isPriority: true })).toEqual([{ prioritySince: { not: null } }]);
  });

  it('sin isPriority no filtra por prioridad', async () => {
    expect(await run({})).toEqual([]);
  });

  it('el día de envío 2026-11-05 es el rango de Costa Rica y solo envíos abiertos', async () => {
    const and = await run({ hearingAidsInLab: true, hearingAidsInLabSentDay: '2026-11-05' });

    expect(and).toContainEqual({
      labShipments: {
        some: {
          deliveredAt: null,
          sentAt: {
            gte: new Date('2026-11-05T06:00:00.000Z'),
            lt: new Date('2026-11-06T06:00:00.000Z'),
          },
        },
      },
    });
  });

  it('el día de envío sin el filtro de laboratorio se ignora', async () => {
    expect(await run({ hearingAidsInLabSentDay: '2026-11-05' })).toEqual([]);
  });
});

describe('PatientStorage.findStaleByTenant', () => {
  it('hace una sola consulta y devuelve uuid, nombre completo y último movimiento', async () => {
    const lastMovementAt = new Date('2026-05-07T15:00:00.000Z');
    const queryRaw = jest
      .fn()
      .mockResolvedValue([
        { uuid: 'p-1', firstName: 'Ana', lastName: 'Mora Solís', lastMovementAt },
      ]);
    const storage = new PatientStorage({ $queryRaw: queryRaw } as never);

    const result = await storage.findStaleByTenant('tenant-1', new Date('2026-05-08T06:00:00.000Z'));

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ uuid: 'p-1', fullName: 'Ana Mora Solís', lastMovementAt }]);
  });
});
