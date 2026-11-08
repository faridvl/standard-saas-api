import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PatientAudiometryEntryStorage } from './patient-audiometry-entry.storage';

const TENANT = 'tenant-1';
const PATIENT = 'patient-1';

describe('PatientAudiometryEntryStorage', () => {
  const findFirst = jest.fn<() => Promise<unknown>>();
  const updateMany = jest.fn<(...args: unknown[]) => Promise<{ count: number }>>();
  const queryRaw = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const storage = new PatientAudiometryEntryStorage({
    patientAudiometryEntry: { findFirst, updateMany },
    $queryRaw: queryRaw,
  } as never);

  beforeEach(() => {
    findFirst.mockReset();
    updateMany.mockReset();
    queryRaw.mockReset();
  });

  it('findByUuid excluye registros de pacientes borrados y filtra por negocio y paciente', async () => {
    findFirst.mockResolvedValue(null);
    await expect(storage.findByUuid('entry-1', PATIENT, TENANT)).resolves.toBeNull();
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        uuid: 'entry-1',
        patientUuid: PATIENT,
        tenantUuid: TENANT,
        patient: { deletedAt: null },
      },
    });
  });

  it('la lista pasa negocio y paciente como parámetros y devuelve ptaType y escala', async () => {
    queryRaw.mockResolvedValue([
      {
        uuid: 'entry-1',
        createdAt: new Date('2026-11-01T10:00:00.000Z'),
        createdByUuid: 'author-1',
        invalidatedAt: new Date('2026-11-02T08:00:00.000Z'),
        invalidatedByUuid: 'reviewer-1',
        invalidationReason: 'Mal colocado',
        ptaType: 'PTA_5124',
        gradingScale: 'BIAP',
        ptaRight: 25,
        ptaLeft: null,
      },
    ]);
    const result = await storage.findAllByPatient(PATIENT, TENANT);

    const [strings, ...values] = queryRaw.mock.calls[0] as [string[], ...unknown[]];
    expect(values).toEqual([TENANT, PATIENT]);
    expect(strings.join('?')).toContain('"tenantUuid" = ?');
    expect(strings.join('?')).not.toContain('"payload",');
    expect(result).toEqual([
      {
        uuid: 'entry-1',
        createdAt: '2026-11-01T10:00:00.000Z',
        createdByUuid: 'author-1',
        invalidatedAt: '2026-11-02T08:00:00.000Z',
        invalidatedByUuid: 'reviewer-1',
        invalidationReason: 'Mal colocado',
        ptaType: 'PTA_5124',
        gradingScale: 'BIAP',
        ptaRight: 25,
        ptaLeft: null,
      },
    ]);
  });

  it('la lista devuelve la marca en null cuando la fila no está marcada', async () => {
    queryRaw.mockResolvedValue([
      {
        uuid: 'entry-2',
        createdAt: new Date('2026-11-01T10:00:00.000Z'),
        createdByUuid: 'author-1',
        invalidatedAt: null,
        invalidatedByUuid: null,
        invalidationReason: null,
        ptaType: 'PTA_5124',
        gradingScale: 'BIAP',
        ptaRight: 25,
        ptaLeft: 30,
      },
    ]);
    const [row] = await storage.findAllByPatient(PATIENT, TENANT);
    expect(row).toMatchObject({
      invalidatedAt: null,
      invalidatedByUuid: null,
      invalidationReason: null,
    });
    const [strings] = queryRaw.mock.calls[0] as [string[]];
    const sql = strings.join('?');
    expect(sql).toContain('"invalidatedAt"');
    expect(sql).toContain('"invalidatedByUuid"');
    expect(sql).toContain('"invalidationReason"');
  });

  it('invalidate filtra por negocio, paciente y solo filas sin marcar, y no toca el payload', async () => {
    updateMany.mockResolvedValue({ count: 1 });
    await expect(storage.invalidate('entry-1', PATIENT, TENANT, 'user-1', 'Motivo')).resolves.toBe(
      true,
    );
    const [args] = updateMany.mock.calls[0] as [{ where: unknown; data: Record<string, unknown> }];
    expect(args.where).toEqual({
      uuid: 'entry-1',
      patientUuid: PATIENT,
      tenantUuid: TENANT,
      invalidatedAt: null,
      patient: { deletedAt: null },
    });
    expect(Object.keys(args.data).sort()).toEqual([
      'invalidatedAt',
      'invalidatedByUuid',
      'invalidationReason',
    ]);
    expect(args.data).toMatchObject({ invalidatedByUuid: 'user-1', invalidationReason: 'Motivo' });
    expect(args.data.invalidatedAt).toBeInstanceOf(Date);
  });

  it('invalidate devuelve false si no había fila (otra clínica, otro paciente o ya marcada)', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(storage.invalidate('entry-1', PATIENT, 'otro', 'user-1', 'Motivo')).resolves.toBe(
      false,
    );
  });
});
