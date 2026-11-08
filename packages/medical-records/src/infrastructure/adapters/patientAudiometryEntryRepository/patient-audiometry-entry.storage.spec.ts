import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PatientAudiometryEntryStorage } from './patient-audiometry-entry.storage';

const TENANT = 'tenant-1';
const PATIENT = 'patient-1';

describe('PatientAudiometryEntryStorage', () => {
  const findFirst = jest.fn<() => Promise<unknown>>();
  const queryRaw = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const storage = new PatientAudiometryEntryStorage({
    patientAudiometryEntry: { findFirst },
    $queryRaw: queryRaw,
  } as never);

  beforeEach(() => {
    findFirst.mockReset();
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
        ptaType: 'PTA_5124',
        gradingScale: 'BIAP',
        ptaRight: 25,
        ptaLeft: null,
      },
    ]);
  });
});
