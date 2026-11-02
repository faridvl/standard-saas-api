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
